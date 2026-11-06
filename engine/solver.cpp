// Heads-up no-limit hold'em postflop solver (Discounted CFR).
//
// The betting tree is built in Python (pokersolver/tree.py) and handed over as
// flat arrays. This file expands the chance nodes (turn / river cards), runs
// vector-form CFR over every hand of both ranges at once with exact card
// removal, and answers queries about the solved strategy.
//
// Built as a shared library and driven through the C API at the bottom.

#include <algorithm>
#include <atomic>
#include <cmath>
#include <condition_variable>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <functional>
#include <memory>
#include <mutex>
#include <new>
#include <numeric>
#include <string>
#include <thread>
#include <unordered_map>
#include <vector>

namespace {

constexpr int kNumCombos = 1326;

// ------------------------------------------------------------------ cards --
// Card id = rank * 4 + suit, rank 0..12 = 2..A, suit 0..3 = c, d, h, s.
// Combo id for cards a > b is a * (a - 1) / 2 + b.

struct ComboTable {
  uint8_t hi[kNumCombos], lo[kNumCombos];
  ComboTable() {
    for (int a = 1; a < 52; ++a)
      for (int b = 0; b < a; ++b) {
        const int i = a * (a - 1) / 2 + b;
        hi[i] = uint8_t(a);
        lo[i] = uint8_t(b);
      }
  }
};
const ComboTable kCombo;

inline uint64_t card_bit(int c) { return uint64_t(1) << c; }

// -------------------------------------------------------------- evaluator --

inline int top_bit(uint32_t m) { return 31 - __builtin_clz(m); }

// Highest rank of a straight contained in a 13-bit rank mask, or -1.
inline int straight_top(uint32_t ranks) {
  const uint32_t x = (ranks << 1) | ((ranks >> 12) & 1u);  // bit 0 = ace low
  const uint32_t s = x & (x >> 1) & (x >> 2) & (x >> 3) & (x >> 4);
  return s ? top_bit(s) + 3 : -1;
}

// The k highest ranks of a mask packed into 4-bit fields.
inline uint32_t top_ranks(uint32_t m, int k) {
  uint32_t v = 0;
  for (int i = 0; i < k; ++i) {
    const int b = top_bit(m);
    v = (v << 4) | uint32_t(b);
    m &= ~(1u << b);
  }
  return v;
}

// Strength of the best five-card hand in a set of 5-7 cards. Larger is better;
// equal values are exact ties.
uint32_t evaluate(uint64_t cards) {
  uint32_t suit[4] = {0, 0, 0, 0};
  for (uint64_t c = cards; c; c &= c - 1) {
    const int i = __builtin_ctzll(c);
    suit[i & 3] |= 1u << (i >> 2);
  }
  // With at most seven cards a flush excludes quads and full houses.
  for (int s = 0; s < 4; ++s) {
    if (__builtin_popcount(suit[s]) >= 5) {
      const int st = straight_top(suit[s]);
      return st >= 0 ? (8u << 20) | uint32_t(st) : (5u << 20) | top_ranks(suit[s], 5);
    }
  }
  const uint32_t a = suit[0], b = suit[1], c = suit[2], d = suit[3];
  const uint32_t ranks = a | b | c | d;
  const uint32_t quads = a & b & c & d;
  const uint32_t three = (a & b & c) | (a & b & d) | (a & c & d) | (b & c & d);
  const uint32_t two = (a & b) | (a & c) | (a & d) | (b & c) | (b & d) | (c & d);
  if (quads) {
    const int q = top_bit(quads);
    return (7u << 20) | (uint32_t(q) << 4) | uint32_t(top_bit(ranks & ~(1u << q)));
  }
  if (three) {
    const int t = top_bit(three);
    const uint32_t rest = two & ~(1u << t);
    if (rest) return (6u << 20) | (uint32_t(t) << 4) | uint32_t(top_bit(rest));
  }
  const int st = straight_top(ranks);
  if (st >= 0) return (4u << 20) | uint32_t(st);
  if (three) {
    const int t = top_bit(three);
    return (3u << 20) | (uint32_t(t) << 8) | top_ranks(ranks & ~(1u << t), 2);
  }
  if (two) {
    const int p1 = top_bit(two);
    const uint32_t rest = two & ~(1u << p1);
    if (rest) {
      const int p2 = top_bit(rest);
      const uint32_t kick = ranks & ~(1u << p1) & ~(1u << p2);
      return (2u << 20) | (uint32_t(p1) << 8) | (uint32_t(p2) << 4) | uint32_t(top_bit(kick));
    }
    return (1u << 20) | (uint32_t(p1) << 12) | top_ranks(ranks & ~(1u << p1), 3);
  }
  return top_ranks(ranks, 5);
}

// ---------------------------------------------------------------- scratch --
// Per-thread bump allocator for the temporary vectors used while traversing.

class Arena {
 public:
  float* alloc(size_t n) {
    if (!buf_) {
      cap_ = size_t(1) << 23;  // 32 MB of address space; only touched pages are used
      buf_.reset(new float[cap_]);
    }
    if (top_ + n > cap_) {
      std::fprintf(stderr, "solver: scratch arena exhausted\n");
      std::abort();
    }
    float* p = buf_.get() + top_;
    top_ += n;
    return p;
  }
  size_t top() const { return top_; }
  void reset(size_t t) { top_ = t; }

 private:
  std::unique_ptr<float[]> buf_;
  size_t cap_ = 0, top_ = 0;
};

thread_local Arena t_arena;

// Releases everything allocated through it when it goes out of scope.
struct Scratch {
  size_t mark = t_arena.top();
  ~Scratch() { t_arena.reset(mark); }
  float* operator()(size_t n) { return t_arena.alloc(n); }
};

struct Rng {
  uint64_t s = 0x9E3779B97F4A7C15ull ^ uint64_t(reinterpret_cast<uintptr_t>(this));
  float uniform() {
    s ^= s << 13;
    s ^= s >> 7;
    s ^= s << 17;
    return float(s >> 40) * (1.0f / 16777216.0f);
  }
};

thread_local Rng t_rng;

// Denormal floats appear as DCFR keeps halving negative regrets and make the
// arithmetic far slower; flush them to zero while the solver runs.
class FlushDenormals {
 public:
  FlushDenormals() {
#if defined(__aarch64__)
    __asm__ __volatile__("mrs %0, fpcr" : "=r"(saved_));
    const uint64_t ftz = saved_ | (uint64_t(1) << 24);
    __asm__ __volatile__("msr fpcr, %0" : : "r"(ftz));
#elif defined(__x86_64__)
    __asm__ __volatile__("stmxcsr %0" : "=m"(saved_));
    uint32_t csr = uint32_t(saved_) | 0x8040u;
    __asm__ __volatile__("ldmxcsr %0" : : "m"(csr));
#endif
  }
  ~FlushDenormals() {
#if defined(__aarch64__)
    __asm__ __volatile__("msr fpcr, %0" : : "r"(saved_));
#elif defined(__x86_64__)
    uint32_t csr = uint32_t(saved_);
    __asm__ __volatile__("ldmxcsr %0" : : "m"(csr));
#endif
  }

 private:
  uint64_t saved_ = 0;
};

// ------------------------------------------------------------ thread pool --

class ThreadPool {
 public:
  explicit ThreadPool(int workers) {
    for (int i = 0; i < workers; ++i) threads_.emplace_back([this] { loop(); });
  }
  ~ThreadPool() {
    {
      std::lock_guard<std::mutex> lk(mu_);
      stop_ = true;
    }
    cv_.notify_all();
    for (auto& t : threads_) t.join();
  }
  int size() const { return int(threads_.size()) + 1; }

  // Runs f(0..n-1) on the workers and the calling thread; returns when done.
  void parallel_for(int n, const std::function<void(int)>& f) {
    if (threads_.empty() || n <= 1) {
      for (int i = 0; i < n; ++i) f(i);
      return;
    }
    {
      std::lock_guard<std::mutex> lk(mu_);
      fn_ = &f;
      total_ = n;
      next_.store(0);
      busy_ = int(threads_.size());
      ++generation_;
    }
    cv_.notify_all();
    drain(f, n);
    std::unique_lock<std::mutex> lk(mu_);
    done_.wait(lk, [this] { return busy_ == 0; });
    fn_ = nullptr;
  }

 private:
  void drain(const std::function<void(int)>& f, int n) {
    for (int i; (i = next_.fetch_add(1)) < n;) f(i);
  }
  void loop() {
    FlushDenormals ftz;
    uint64_t seen = 0;
    std::unique_lock<std::mutex> lk(mu_);
    for (;;) {
      cv_.wait(lk, [&] { return stop_ || generation_ != seen; });
      if (stop_) return;
      seen = generation_;
      const std::function<void(int)>* f = fn_;
      const int n = total_;
      lk.unlock();
      drain(*f, n);
      lk.lock();
      if (--busy_ == 0) done_.notify_one();
    }
  }

  std::vector<std::thread> threads_;
  std::mutex mu_;
  std::condition_variable cv_, done_;
  const std::function<void(int)>* fn_ = nullptr;
  int total_ = 0, busy_ = 0;
  uint64_t generation_ = 0;
  std::atomic<int> next_{0};
  bool stop_ = false;
};

// ------------------------------------------------------------------- game --

enum NodeType : uint8_t {
  kOop = 0,       // OOP to act
  kIp = 1,        // IP to act
  kChance = 2,    // deal the next board card
  kFoldOop = 3,   // OOP folded
  kFoldIp = 4,    // IP folded
  kShowdown = 5,  // river showdown
};

struct Node {
  uint8_t type;
  int8_t dealt;    // card dealt on the edge into this node, -1 if none
  uint16_t num;    // number of children
  int32_t tmpl;    // betting-template node
  int32_t child;   // first entry in child_list_
  int32_t board;   // index into boards_
  int32_t dec;     // decision-node index (compression scales), -1 otherwise
  int64_t offset;  // first storage slot of a decision node
};

struct Board {
  uint64_t mask;
  int32_t ncards;
  int32_t river;  // showdown table index when the board is complete
};

enum Mode { kCfr, kBestResponse, kExpected };

struct Walk {
  Mode mode;
  int p;  // the player whose values are computed
  float alpha = 0, beta = 0, gamma = 0;
};

class Solver {
 public:
  std::string error;

  bool init(const uint8_t* board, int board_len, float pot, const float* range_oop,
            const float* range_ip, int n_tmpl, const uint8_t* t_type, const int32_t* t_first,
            const int32_t* t_count, int n_child, const int32_t* t_child, const float* t_inv_oop,
            const float* t_inv_ip);
  int64_t storage() const { return storage_; }
  int64_t num_nodes() const { return int64_t(nodes_.size()); }
  int hands(int p) const { return n_[p]; }
  void allocate(bool compressed);
  void set_threads(int n);
  void run(int iterations);
  int iteration() const { return iteration_; }
  double exploitability();
  int query(const int32_t* path, int len, int32_t* info, float* reach, float* compat, float* eq,
            float* ev, float* strat, float* aev, int flags);

 private:
  int build(int t, int board);
  int river_table(uint64_t mask);

  void traverse(int id, const Walk& w, const float* opp, const float* own, float* out, bool par);
  void player_node(const Node& nd, const Walk& w, const float* opp, const float* own, float* out,
                   bool par);
  void opponent_node(const Node& nd, const Walk& w, const float* opp, const float* own,
                     float* out, bool par);
  void chance_node(const Node& nd, const Walk& w, const float* opp, const float* own, float* out,
                   bool par);
  void fold_node(const Node& nd, int p, const float* opp, float* out) const;
  void showdown_node(const Node& nd, int p, const float* opp, float* out) const;

  void compat_sums(int p, const float* opp, float* out) const;
  void sweep(int p, const uint32_t* sp, const uint16_t* op, const uint32_t* sq,
             const uint16_t* oq, const float* opp, float* win, float* lose) const;
  void equity(uint64_t mask, const std::vector<float>* r, float* eq) const;

  void load_regrets(const Node& nd, int n, float* dst) const;
  void store_regrets(const Node& nd, int n, const float* src);
  void load_strategy_sum(const Node& nd, int n, float* dst) const;
  void store_strategy_sum(const Node& nd, int n, const float* src);
  void current_strategy(const Node& nd, int n, float* dst) const;
  void average_strategy(const Node& nd, int n, float* dst) const;
  int child(const Node& nd, int k) const { return child_list_[size_t(nd.child) + k]; }

  // betting template
  std::vector<uint8_t> t_type_;
  std::vector<int32_t> t_first_, t_count_, t_child_;
  std::vector<float> t_inv_[2];
  float pot_ = 0;

  // hands of each player: OOP = 0, IP = 1
  int n_[2] = {0, 0};
  std::vector<uint16_t> combo_[2];
  std::vector<uint8_t> c1_[2], c2_[2];
  std::vector<uint64_t> bits_[2];
  std::vector<float> reach0_[2];
  std::vector<int32_t> same_[2];  // opponent hand holding the same two cards, or -1
  std::vector<int32_t> hand_index_[2];
  std::vector<uint16_t> with_card_[2][52];
  double norm_ = 0;  // total weight of compatible (OOP, IP) hand pairs

  // expanded game tree
  std::vector<Node> nodes_;
  std::vector<int32_t> child_list_;
  std::vector<Board> boards_;
  std::unordered_map<uint64_t, int> river_index_;
  int num_rivers_ = 0;
  std::vector<uint32_t> strength_[2];  // per river board, per hand
  std::vector<uint16_t> order_[2];     // hands sorted by strength (ascending)

  // regrets and cumulative strategy, float or 16-bit with a per-node scale
  int64_t storage_ = 0;
  int32_t num_dec_ = 0;
  bool compressed_ = false;
  std::vector<float> reg_f_, str_f_;
  std::vector<int16_t> reg_q_;
  std::vector<uint16_t> str_q_;
  std::vector<float> reg_scale_, str_scale_;

  int iteration_ = 0;
  std::unique_ptr<ThreadPool> pool_;
};

bool Solver::init(const uint8_t* board, int board_len, float pot, const float* range_oop,
                  const float* range_ip, int n_tmpl, const uint8_t* t_type,
                  const int32_t* t_first, const int32_t* t_count, int n_child,
                  const int32_t* t_child, const float* t_inv_oop, const float* t_inv_ip) {
  if (board_len < 3 || board_len > 5) {
    error = "the board must have 3 to 5 cards";
    return false;
  }
  uint64_t mask = 0;
  for (int i = 0; i < board_len; ++i) {
    if (board[i] >= 52 || (mask & card_bit(board[i]))) {
      error = "invalid or duplicate board card";
      return false;
    }
    mask |= card_bit(board[i]);
  }
  if (!(pot > 0)) {
    error = "the pot must be positive";
    return false;
  }
  pot_ = pot;

  if (n_tmpl <= 0 || (t_type[0] != kOop && t_type[0] != kIp)) {
    error = "the betting tree must start with a decision";
    return false;
  }
  t_type_.assign(t_type, t_type + n_tmpl);
  t_first_.assign(t_first, t_first + n_tmpl);
  t_count_.assign(t_count, t_count + n_tmpl);
  t_child_.assign(t_child, t_child + n_child);
  t_inv_[0].assign(t_inv_oop, t_inv_oop + n_tmpl);
  t_inv_[1].assign(t_inv_ip, t_inv_ip + n_tmpl);
  for (int t = 0; t < n_tmpl; ++t) {
    const int ty = t_type_[t];
    const bool decision = ty == kOop || ty == kIp;
    if (ty > kShowdown || t_count_[t] < 0 || t_first_[t] < 0 ||
        int64_t(t_first_[t]) + t_count_[t] > n_child || (decision && t_count_[t] < 1) ||
        (ty == kChance && t_count_[t] != 1)) {
      error = "malformed betting tree";
      return false;
    }
    for (int k = 0; k < t_count_[t]; ++k) {
      const int c = t_child_[t_first_[t] + k];
      if (c <= t || c >= n_tmpl) {
        error = "malformed betting tree";
        return false;
      }
    }
  }

  for (int p = 0; p < 2; ++p) {
    const float* range = p == 0 ? range_oop : range_ip;
    hand_index_[p].assign(kNumCombos, -1);
    for (int c = 0; c < kNumCombos; ++c) {
      const float w = range[c];
      if (!(w > 0)) continue;
      const uint64_t hb = card_bit(kCombo.hi[c]) | card_bit(kCombo.lo[c]);
      if (hb & mask) continue;
      hand_index_[p][c] = int32_t(combo_[p].size());
      combo_[p].push_back(uint16_t(c));
      c1_[p].push_back(kCombo.hi[c]);
      c2_[p].push_back(kCombo.lo[c]);
      bits_[p].push_back(hb);
      reach0_[p].push_back(std::min(w, 1.0f));
    }
    n_[p] = int(combo_[p].size());
    if (n_[p] == 0) {
      error = p == 0 ? "the OOP range is empty on this board" : "the IP range is empty on this board";
      return false;
    }
    for (int i = 0; i < n_[p]; ++i) {
      with_card_[p][c1_[p][i]].push_back(uint16_t(i));
      with_card_[p][c2_[p][i]].push_back(uint16_t(i));
    }
  }
  for (int p = 0; p < 2; ++p) {
    same_[p].resize(n_[p]);
    for (int i = 0; i < n_[p]; ++i) same_[p][i] = hand_index_[1 - p][combo_[p][i]];
  }
  {
    std::vector<float> comp(n_[0]);
    compat_sums(0, reach0_[1].data(), comp.data());
    norm_ = 0;
    for (int i = 0; i < n_[0]; ++i) norm_ += double(reach0_[0][i]) * comp[i];
    if (!(norm_ > 0)) {
      error = "the two ranges block each other completely";
      return false;
    }
  }

  boards_.push_back(Board{mask, board_len, board_len == 5 ? river_table(mask) : -1});
  build(0, 0);
  if (!error.empty()) return false;
  return true;
}

int Solver::river_table(uint64_t mask) {
  const auto it = river_index_.find(mask);
  if (it != river_index_.end()) return it->second;
  const int id = num_rivers_++;
  for (int p = 0; p < 2; ++p) {
    const size_t base = strength_[p].size();
    strength_[p].resize(base + n_[p]);
    order_[p].resize(base + n_[p]);
    uint32_t* s = &strength_[p][base];
    uint16_t* o = &order_[p][base];
    for (int i = 0; i < n_[p]; ++i) {
      s[i] = (bits_[p][i] & mask) ? 0 : evaluate(bits_[p][i] | mask);
      o[i] = uint16_t(i);
    }
    std::sort(o, o + n_[p], [s](uint16_t x, uint16_t y) { return s[x] < s[y]; });
  }
  river_index_.emplace(mask, id);
  return id;
}

int Solver::build(int t, int board) {
  const int id = int(nodes_.size());
  nodes_.push_back(Node{});
  Node nd{};
  nd.type = t_type_[t];
  nd.dealt = -1;
  nd.tmpl = t;
  nd.board = board;
  nd.dec = -1;
  nd.offset = -1;
  nd.child = -1;
  nd.num = 0;
  switch (nd.type) {
    case kOop:
    case kIp: {
      nd.num = uint16_t(t_count_[t]);
      nd.child = int32_t(child_list_.size());
      child_list_.resize(child_list_.size() + nd.num);
      nd.dec = num_dec_++;
      nd.offset = storage_;
      storage_ += int64_t(nd.num) * n_[nd.type];
      nodes_[id] = nd;
      for (int k = 0; k < nd.num; ++k) {
        const int c = build(t_child_[t_first_[t] + k], board);
        child_list_[size_t(nd.child) + k] = c;
      }
      break;
    }
    case kChance: {
      const Board b = boards_[board];
      if (b.ncards >= 5) {
        error = "chance node on a complete board";
        nodes_[id] = nd;
        return id;
      }
      int cards[52], k = 0;
      for (int c = 0; c < 52; ++c)
        if (!(b.mask & card_bit(c))) cards[k++] = c;
      nd.num = uint16_t(k);
      nd.child = int32_t(child_list_.size());
      child_list_.resize(child_list_.size() + nd.num);
      nodes_[id] = nd;
      const int tc = t_child_[t_first_[t]];
      for (int i = 0; i < k; ++i) {
        Board nb{b.mask | card_bit(cards[i]), b.ncards + 1, -1};
        if (nb.ncards == 5) nb.river = river_table(nb.mask);
        boards_.push_back(nb);
        const int c = build(tc, int(boards_.size()) - 1);
        nodes_[c].dealt = int8_t(cards[i]);
        child_list_[size_t(nd.child) + i] = c;
      }
      break;
    }
    case kShowdown:
      if (boards_[board].ncards != 5) error = "showdown before the river";
      nodes_[id] = nd;
      break;
    default:
      nodes_[id] = nd;
  }
  return id;
}

void Solver::allocate(bool compressed) {
  compressed_ = compressed;
  const size_t len = size_t(storage_);
  if (compressed) {
    reg_q_.assign(len, 0);
    str_q_.assign(len, 0);
    reg_scale_.assign(num_dec_, 0.f);
    str_scale_.assign(num_dec_, 0.f);
  } else {
    reg_f_.assign(len, 0.f);
    str_f_.assign(len, 0.f);
  }
}

void Solver::set_threads(int n) {
  n = std::max(1, std::min(n, 64));
  pool_.reset(n > 1 ? new ThreadPool(n - 1) : nullptr);
}

// ---------------------------------------------------------------- storage --

void Solver::load_regrets(const Node& nd, int n, float* dst) const {
  const size_t len = size_t(nd.num) * n;
  if (!compressed_) {
    std::memcpy(dst, &reg_f_[nd.offset], len * sizeof(float));
    return;
  }
  const float s = reg_scale_[nd.dec];
  const int16_t* src = &reg_q_[nd.offset];
  for (size_t i = 0; i < len; ++i) dst[i] = float(src[i]) * s;
}

void Solver::store_regrets(const Node& nd, int n, const float* src) {
  const size_t len = size_t(nd.num) * n;
  if (!compressed_) {
    std::memcpy(&reg_f_[nd.offset], src, len * sizeof(float));
    return;
  }
  float mx = 0;
  for (size_t i = 0; i < len; ++i) mx = std::max(mx, std::fabs(src[i]));
  int16_t* dst = &reg_q_[nd.offset];
  reg_scale_[nd.dec] = mx / 32767.f;
  if (mx == 0) {
    std::fill(dst, dst + len, int16_t(0));
    return;
  }
  const float inv = 32767.f / mx;
  Rng& rng = t_rng;
  for (size_t i = 0; i < len; ++i) {  // stochastic rounding keeps small updates unbiased
    const float v = std::floor(src[i] * inv + rng.uniform());
    dst[i] = int16_t(std::max(-32767.f, std::min(32767.f, v)));
  }
}

void Solver::load_strategy_sum(const Node& nd, int n, float* dst) const {
  const size_t len = size_t(nd.num) * n;
  if (!compressed_) {
    std::memcpy(dst, &str_f_[nd.offset], len * sizeof(float));
    return;
  }
  const float s = str_scale_[nd.dec];
  const uint16_t* src = &str_q_[nd.offset];
  for (size_t i = 0; i < len; ++i) dst[i] = float(src[i]) * s;
}

void Solver::store_strategy_sum(const Node& nd, int n, const float* src) {
  const size_t len = size_t(nd.num) * n;
  if (!compressed_) {
    std::memcpy(&str_f_[nd.offset], src, len * sizeof(float));
    return;
  }
  float mx = 0;
  for (size_t i = 0; i < len; ++i) mx = std::max(mx, src[i]);
  uint16_t* dst = &str_q_[nd.offset];
  str_scale_[nd.dec] = mx / 65535.f;
  if (mx == 0) {
    std::fill(dst, dst + len, uint16_t(0));
    return;
  }
  const float inv = 65535.f / mx;
  Rng& rng = t_rng;
  for (size_t i = 0; i < len; ++i) {
    const float v = std::floor(src[i] * inv + rng.uniform());
    dst[i] = uint16_t(std::max(0.f, std::min(65535.f, v)));
  }
}

// Normalizes non-negative per-action weights (A x n, action-major) per hand;
// hands whose weights sum to zero get the uniform strategy.
void normalize_columns(float* s, int A, int n) {
  Scratch scratch;
  float* sum = scratch(n);
  std::fill(sum, sum + n, 0.f);
  for (int a = 0; a < A; ++a)
    for (int i = 0; i < n; ++i) sum[i] += s[size_t(a) * n + i];
  const float uniform = 1.f / float(A);
  for (int a = 0; a < A; ++a)
    for (int i = 0; i < n; ++i) {
      float& x = s[size_t(a) * n + i];
      x = sum[i] > 0 ? x / sum[i] : uniform;
    }
}

// Regret matching on the stored cumulative regrets.
void Solver::current_strategy(const Node& nd, int n, float* dst) const {
  load_regrets(nd, n, dst);
  const size_t len = size_t(nd.num) * n;
  for (size_t i = 0; i < len; ++i) dst[i] = std::max(dst[i], 0.f);
  normalize_columns(dst, nd.num, n);
}

void Solver::average_strategy(const Node& nd, int n, float* dst) const {
  load_strategy_sum(nd, n, dst);
  normalize_columns(dst, nd.num, n);
}

// -------------------------------------------------------------- terminals --

// Opponent weight that does not share a card with each hero hand.
void Solver::compat_sums(int p, const float* opp, float* out) const {
  const int q = 1 - p;
  float total = 0, cs[52] = {0};
  for (int j = 0; j < n_[q]; ++j) {
    const float x = opp[j];
    if (x == 0) continue;
    total += x;
    cs[c1_[q][j]] += x;
    cs[c2_[q][j]] += x;
  }
  for (int i = 0; i < n_[p]; ++i) {
    const int s = same_[p][i];
    out[i] = total - cs[c1_[p][i]] - cs[c2_[p][i]] + (s >= 0 ? opp[s] : 0.f);
  }
}

// For each hero hand: compatible opponent weight that it beats (win) and that
// beats it (lose). Hands are visited in strength order, so this is linear.
void Solver::sweep(int p, const uint32_t* sp, const uint16_t* op, const uint32_t* sq,
                   const uint16_t* oq, const float* opp, float* win, float* lose) const {
  const int q = 1 - p, n = n_[p], m = n_[q];
  const uint8_t *h1 = c1_[p].data(), *h2 = c2_[p].data();
  const uint8_t *o1 = c1_[q].data(), *o2 = c2_[q].data();
  float cum = 0, cc[52] = {0};
  int j = 0;
  for (int k = 0; k < n; ++k) {
    const int i = op[k];
    const uint32_t s = sp[i];
    while (j < m && sq[oq[j]] < s) {
      const int o = oq[j++];
      const float x = opp[o];
      cum += x;
      cc[o1[o]] += x;
      cc[o2[o]] += x;
    }
    win[i] = cum - cc[h1[i]] - cc[h2[i]];
  }
  cum = 0;
  std::fill(cc, cc + 52, 0.f);
  j = m - 1;
  for (int k = n - 1; k >= 0; --k) {
    const int i = op[k];
    const uint32_t s = sp[i];
    while (j >= 0 && sq[oq[j]] > s) {
      const int o = oq[j--];
      const float x = opp[o];
      cum += x;
      cc[o1[o]] += x;
      cc[o2[o]] += x;
    }
    lose[i] = cum - cc[h1[i]] - cc[h2[i]];
  }
}

// Payoffs are chips won from the pot minus chips put in during the tree, so
// the two players' values at the root always add up to the starting pot.
void Solver::fold_node(const Node& nd, int p, const float* opp, float* out) const {
  const int folder = nd.type == kFoldOop ? 0 : 1;
  const float payoff = folder == p ? -t_inv_[p][nd.tmpl] : pot_ + t_inv_[folder][nd.tmpl];
  compat_sums(p, opp, out);
  for (int i = 0; i < n_[p]; ++i) out[i] *= payoff;
}

void Solver::showdown_node(const Node& nd, int p, const float* opp, float* out) const {
  const int q = 1 - p, n = n_[p], m = n_[q];
  const size_t r = size_t(boards_[nd.board].river);
  const float inv = t_inv_[p][nd.tmpl];
  const float win = pot_ + inv, lose = -inv, tie = 0.5f * pot_;
  Scratch scratch;
  float* w = scratch(n);
  float* l = scratch(n);
  sweep(p, &strength_[p][r * n], &order_[p][r * n], &strength_[q][r * m], &order_[q][r * m], opp,
        w, l);
  compat_sums(p, opp, out);
  for (int i = 0; i < n; ++i) out[i] = win * w[i] + lose * l[i] + tie * (out[i] - w[i] - l[i]);
}

// --------------------------------------------------------------- traverse --
// Computes counterfactual values of player w.p's hands at node `id`, given the
// opponent's reach `opp`. In CFR mode also updates w.p's regrets and average
// strategy (`own` is w.p's reach, used to weight the average).

void Solver::traverse(int id, const Walk& w, const float* opp, const float* own, float* out,
                      bool par) {
  const Node& nd = nodes_[id];
  switch (nd.type) {
    case kOop:
    case kIp:
      if (nd.type == w.p)
        player_node(nd, w, opp, own, out, par);
      else
        opponent_node(nd, w, opp, own, out, par);
      return;
    case kChance:
      chance_node(nd, w, opp, own, out, par);
      return;
    case kShowdown:
      showdown_node(nd, w.p, opp, out);
      return;
    default:
      fold_node(nd, w.p, opp, out);
  }
}

void Solver::player_node(const Node& nd, const Walk& w, const float* opp, const float* own,
                         float* out, bool par) {
  const int A = nd.num, n = n_[w.p];
  const size_t len = size_t(A) * n;
  Scratch scratch;
  float* strat = scratch(len);
  float* cfv = scratch(len);
  float* child_own = nullptr;
  if (w.mode == kCfr) {
    current_strategy(nd, n, strat);
    child_own = scratch(n);
  } else if (w.mode == kExpected) {
    average_strategy(nd, n, strat);
  }
  for (int a = 0; a < A; ++a) {
    if (child_own) {
      const float* s = strat + size_t(a) * n;
      for (int i = 0; i < n; ++i) child_own[i] = own[i] * s[i];
    }
    traverse(child(nd, a), w, opp, child_own ? child_own : own, cfv + size_t(a) * n, par);
  }

  if (w.mode == kBestResponse) {
    std::copy(cfv, cfv + n, out);
    for (int a = 1; a < A; ++a)
      for (int i = 0; i < n; ++i) out[i] = std::max(out[i], cfv[size_t(a) * n + i]);
    return;
  }
  std::fill(out, out + n, 0.f);
  for (int a = 0; a < A; ++a)
    for (int i = 0; i < n; ++i) out[i] += strat[size_t(a) * n + i] * cfv[size_t(a) * n + i];
  if (w.mode != kCfr) return;

  // Discounted CFR: positive regrets decay by alpha_t, negative ones by beta_t,
  // and the average strategy by gamma_t.
  float* buf = scratch(len);
  load_regrets(nd, n, buf);
  for (int a = 0; a < A; ++a) {
    float* r = buf + size_t(a) * n;
    const float* v = cfv + size_t(a) * n;
    for (int i = 0; i < n; ++i) r[i] = r[i] * (r[i] > 0 ? w.alpha : w.beta) + (v[i] - out[i]);
  }
  store_regrets(nd, n, buf);
  load_strategy_sum(nd, n, buf);
  for (int a = 0; a < A; ++a) {
    float* s = buf + size_t(a) * n;
    const float* cur = strat + size_t(a) * n;
    for (int i = 0; i < n; ++i) s[i] = s[i] * w.gamma + cur[i] * own[i];
  }
  store_strategy_sum(nd, n, buf);
}

void Solver::opponent_node(const Node& nd, const Walk& w, const float* opp, const float* own,
                           float* out, bool par) {
  const int q = 1 - w.p, A = nd.num, m = n_[q], n = n_[w.p];
  Scratch scratch;
  float* strat = scratch(size_t(A) * m);
  if (w.mode == kCfr)
    current_strategy(nd, m, strat);
  else
    average_strategy(nd, m, strat);
  float* child_opp = scratch(m);
  float* tmp = scratch(n);
  std::fill(out, out + n, 0.f);
  for (int a = 0; a < A; ++a) {
    const float* s = strat + size_t(a) * m;
    bool any = false;
    for (int j = 0; j < m; ++j) {
      child_opp[j] = opp[j] * s[j];
      any |= child_opp[j] != 0;
    }
    if (!any) continue;
    traverse(child(nd, a), w, child_opp, own, tmp, par);
    for (int i = 0; i < n; ++i) out[i] += tmp[i];
  }
}

void Solver::chance_node(const Node& nd, const Walk& w, const float* opp, const float* own,
                         float* out, bool par) {
  const int p = w.p, q = 1 - p, n = n_[p], m = n_[q], K = nd.num;
  // Given both players' hands, every remaining card is equally likely.
  const float factor = 1.f / float(52 - boards_[nd.board].ncards - 4);

  auto run_child = [&](int k, float* res, bool child_par) {
    Scratch scratch;
    const int cid = child(nd, k);
    const int card = nodes_[cid].dealt;
    float* copp = scratch(m);
    bool any = false;
    for (int j = 0; j < m; ++j) {
      copp[j] = opp[j] * factor;
      any |= copp[j] != 0;
    }
    for (uint16_t j : with_card_[q][card]) copp[j] = 0;
    if (!any) {
      std::fill(res, res + n, 0.f);
      return;
    }
    float* cown = nullptr;
    if (own) {
      cown = scratch(n);
      std::copy(own, own + n, cown);
      for (uint16_t i : with_card_[p][card]) cown[i] = 0;
    }
    traverse(cid, w, copp, cown, res, child_par);
    for (uint16_t i : with_card_[p][card]) res[i] = 0;
  };

  std::fill(out, out + n, 0.f);
  Scratch scratch;
  if (par && pool_ && pool_->size() > 1) {
    float* results = scratch(size_t(K) * n);
    pool_->parallel_for(K, [&](int k) { run_child(k, results + size_t(k) * n, false); });
    for (int k = 0; k < K; ++k)
      for (int i = 0; i < n; ++i) out[i] += results[size_t(k) * n + i];
  } else {
    float* tmp = scratch(n);
    for (int k = 0; k < K; ++k) {
      run_child(k, tmp, par);
      for (int i = 0; i < n; ++i) out[i] += tmp[i];
    }
  }
}

// ------------------------------------------------------------------ solve --

void Solver::run(int iterations) {
  for (int it = 0; it < iterations; ++it) {
    const int t = ++iteration_;
    Walk w{kCfr, 0};
    const double ta = std::pow(double(t - 1), 1.5);
    w.alpha = float(ta / (ta + 1.0));
    w.beta = 0.5f;
    w.gamma = float(std::pow(double(t - 1) / double(t), 2.0));
    for (int p = 0; p < 2; ++p) {
      w.p = p;
      Scratch scratch;
      float* out = scratch(n_[p]);
      traverse(0, w, reach0_[1 - p].data(), reach0_[p].data(), out, true);
    }
  }
}

// Average gain (in chips) a best response would make against the current
// average strategy, i.e. half the sum of both players' best-response gains.
double Solver::exploitability() {
  double total = 0;
  for (int p = 0; p < 2; ++p) {
    Walk w{kBestResponse, p};
    Scratch scratch;
    float* out = scratch(n_[p]);
    traverse(0, w, reach0_[1 - p].data(), nullptr, out, true);
    for (int i = 0; i < n_[p]; ++i) total += double(reach0_[p][i]) * out[i];
  }
  return (total / norm_ - pot_) / 2.0;
}

// ------------------------------------------------------------------ query --

// Equity of every hand of both players against the other's weights `r`, over
// all remaining runouts of the board `mask`.
void Solver::equity(uint64_t mask, const std::vector<float>* r, float* eq) const {
  std::vector<int> rest;
  for (int c = 0; c < 52; ++c)
    if (!(mask & card_bit(c))) rest.push_back(c);
  std::vector<double> num[2], den[2];
  std::vector<uint32_t> st[2];
  std::vector<uint16_t> ord[2];
  std::vector<float> wt[2];
  for (int p = 0; p < 2; ++p) {
    num[p].assign(n_[p], 0.0);
    den[p].assign(n_[p], 0.0);
    st[p].resize(n_[p]);
    ord[p].resize(n_[p]);
    wt[p].resize(n_[p]);
  }
  const int nmax = std::max(n_[0], n_[1]);
  std::vector<float> win(nmax), lose(nmax), comp(nmax);

  auto run_board = [&](uint64_t full) {
    for (int p = 0; p < 2; ++p) {
      for (int i = 0; i < n_[p]; ++i) {
        const bool blocked = bits_[p][i] & full;
        st[p][i] = blocked ? 0 : evaluate(bits_[p][i] | full);
        wt[p][i] = blocked ? 0.f : r[p][i];
      }
      std::iota(ord[p].begin(), ord[p].end(), uint16_t(0));
      const uint32_t* s = st[p].data();
      std::sort(ord[p].begin(), ord[p].end(), [s](uint16_t x, uint16_t y) { return s[x] < s[y]; });
    }
    for (int p = 0; p < 2; ++p) {
      const int q = 1 - p;
      sweep(p, st[p].data(), ord[p].data(), st[q].data(), ord[q].data(), wt[q].data(), win.data(),
            lose.data());
      compat_sums(p, wt[q].data(), comp.data());
      for (int i = 0; i < n_[p]; ++i) {
        if (!st[p][i]) continue;
        num[p][i] += win[i] + 0.5 * (double(comp[i]) - win[i] - lose[i]);
        den[p][i] += comp[i];
      }
    }
  };

  const int ncards = __builtin_popcountll(mask);
  if (ncards == 5) {
    run_board(mask);
  } else if (ncards == 4) {
    for (int c : rest) run_board(mask | card_bit(c));
  } else {
    for (size_t x = 0; x < rest.size(); ++x)
      for (size_t y = x + 1; y < rest.size(); ++y)
        run_board(mask | card_bit(rest[x]) | card_bit(rest[y]));
  }
  for (int p = 0; p < 2; ++p)
    for (int i = 0; i < n_[p]; ++i)
      if (den[p][i] > 0) eq[p * kNumCombos + combo_[p][i]] = float(num[p][i] / den[p][i]);
}

// Walks `path` (action indices at decisions, card ids at chance nodes) using
// the average strategy and reports the node. Output arrays are indexed by
// combo id (two players x 1326 for reach/compat/eq/ev, actions x 1326 for
// strat/aev) and hold NaN for combos outside a range.
// info = {node type, template id, number of children}.
// flags: 1 = expected values, 2 = equities.
int Solver::query(const int32_t* path, int len, int32_t* info, float* reach, float* compat,
                  float* eq, float* ev, float* strat, float* aev, int flags) {
  std::vector<float> r[2] = {reach0_[0], reach0_[1]};
  int id = 0;
  for (int k = 0; k < len; ++k) {
    const Node& nd = nodes_[id];
    const int step = path[k];
    if (nd.type == kOop || nd.type == kIp) {
      if (step < 0 || step >= nd.num) return -1;
      const int a = nd.type, n = n_[a];
      std::vector<float> s(size_t(nd.num) * n);
      average_strategy(nd, n, s.data());
      for (int i = 0; i < n; ++i) r[a][i] *= s[size_t(step) * n + i];
      id = child(nd, step);
    } else if (nd.type == kChance) {
      int found = -1;
      for (int c = 0; c < nd.num; ++c)
        if (nodes_[child(nd, c)].dealt == step) found = child(nd, c);
      if (found < 0) return -1;
      for (int p = 0; p < 2; ++p)
        for (uint16_t i : with_card_[p][step]) r[p][i] = 0;
      id = found;
    } else {
      return -1;
    }
  }

  const Node& nd = nodes_[id];
  info[0] = nd.type;
  info[1] = nd.tmpl;
  info[2] = nd.num;
  const bool decision = nd.type == kOop || nd.type == kIp;
  const int A = decision ? nd.num : 0;
  const float nan = std::nanf("");
  std::fill(reach, reach + 2 * kNumCombos, nan);
  std::fill(compat, compat + 2 * kNumCombos, nan);
  std::fill(eq, eq + 2 * kNumCombos, nan);
  std::fill(ev, ev + 2 * kNumCombos, nan);
  std::fill(strat, strat + size_t(A) * kNumCombos, nan);
  std::fill(aev, aev + size_t(A) * kNumCombos, nan);

  std::vector<float> comp[2];
  for (int p = 0; p < 2; ++p) {
    comp[p].resize(n_[p]);
    compat_sums(p, r[1 - p].data(), comp[p].data());
    for (int i = 0; i < n_[p]; ++i) {
      reach[p * kNumCombos + combo_[p][i]] = r[p][i];
      compat[p * kNumCombos + combo_[p][i]] = comp[p][i];
    }
  }

  std::vector<float> s;
  if (decision) {
    const int a = nd.type, n = n_[a];
    s.resize(size_t(A) * n);
    average_strategy(nd, n, s.data());
    for (int k = 0; k < A; ++k)
      for (int i = 0; i < n; ++i) strat[size_t(k) * kNumCombos + combo_[a][i]] = s[size_t(k) * n + i];
  }

  if (flags & 1) {
    for (int p = 0; p < 2; ++p) {
      const int n = n_[p];
      Walk w{kExpected, p};
      std::vector<float> out(n, 0.f);
      if (decision && nd.type == p) {
        std::vector<float> cfv(n);
        for (int k = 0; k < A; ++k) {
          traverse(child(nd, k), w, r[1 - p].data(), nullptr, cfv.data(), true);
          for (int i = 0; i < n; ++i) {
            out[i] += s[size_t(k) * n + i] * cfv[i];
            if (comp[p][i] > 1e-9f) aev[size_t(k) * kNumCombos + combo_[p][i]] = cfv[i] / comp[p][i];
          }
        }
      } else {
        traverse(id, w, r[1 - p].data(), nullptr, out.data(), true);
      }
      for (int i = 0; i < n; ++i)
        if (comp[p][i] > 1e-9f) ev[p * kNumCombos + combo_[p][i]] = out[i] / comp[p][i];
    }
  }
  if (flags & 2) equity(boards_[nd.board].mask, r, eq);
  return 0;
}

thread_local std::string t_error;

}  // namespace

// ------------------------------------------------------------------ C API --

extern "C" {

const char* ps_last_error() { return t_error.c_str(); }

void* ps_create(const uint8_t* board, int board_len, float pot, const float* range_oop,
                const float* range_ip, int n_tmpl, const uint8_t* t_type, const int32_t* t_first,
                const int32_t* t_count, int n_child, const int32_t* t_child,
                const float* t_inv_oop, const float* t_inv_ip) {
  try {
    auto* s = new Solver();
    if (!s->init(board, board_len, pot, range_oop, range_ip, n_tmpl, t_type, t_first, t_count,
                 n_child, t_child, t_inv_oop, t_inv_ip)) {
      t_error = s->error;
      delete s;
      return nullptr;
    }
    return s;
  } catch (const std::bad_alloc&) {
    t_error = "out of memory while building the game tree";
    return nullptr;
  }
}

void ps_destroy(void* g) { delete static_cast<Solver*>(g); }

int64_t ps_num_nodes(void* g) { return static_cast<Solver*>(g)->num_nodes(); }

// Number of (action, hand) slots; each slot needs 8 bytes, or 4 compressed.
int64_t ps_storage(void* g) { return static_cast<Solver*>(g)->storage(); }

int ps_hands(void* g, int player) { return static_cast<Solver*>(g)->hands(player); }

int ps_allocate(void* g, int compressed) {
  try {
    static_cast<Solver*>(g)->allocate(compressed != 0);
    return 0;
  } catch (const std::bad_alloc&) {
    t_error = "out of memory while allocating the solver";
    return -1;
  }
}

void ps_set_threads(void* g, int n) { static_cast<Solver*>(g)->set_threads(n); }

void ps_run(void* g, int iterations) {
  FlushDenormals ftz;
  static_cast<Solver*>(g)->run(iterations);
}

int ps_iteration(void* g) { return static_cast<Solver*>(g)->iteration(); }

double ps_exploitability(void* g) {
  FlushDenormals ftz;
  return static_cast<Solver*>(g)->exploitability();
}

int ps_query(void* g, const int32_t* path, int len, int32_t* info, float* reach, float* compat,
             float* eq, float* ev, float* strat, float* aev, int flags) {
  FlushDenormals ftz;
  return static_cast<Solver*>(g)->query(path, len, info, reach, compat, eq, ev, strat, aev, flags);
}

uint32_t ps_evaluate(const uint8_t* cards, int n) {
  uint64_t mask = 0;
  for (int i = 0; i < n; ++i) mask |= card_bit(cards[i]);
  return evaluate(mask);
}

}  // extern "C"
