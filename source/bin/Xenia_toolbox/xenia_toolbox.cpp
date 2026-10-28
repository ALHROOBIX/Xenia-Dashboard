#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <filesystem>
#include <cstring>
#include <cstdint>
#include <sstream>
#include <random>
#include <algorithm>
#include <iomanip>
#include <cstdio>
#include <unordered_map>

#ifdef _WIN32
#include <windows.h>
#endif

namespace fs = std::filesystem;

inline uint16_t read_be16(const uint8_t* p) {
    return (uint16_t)(((uint16_t)p[0] << 8) | (uint16_t)p[1]);
}
inline uint32_t read_be32(const uint8_t* p) {
    return ((uint32_t)p[0] << 24) | ((uint32_t)p[1] << 16) |
    ((uint32_t)p[2] << 8)  |  (uint32_t)p[3];
}
inline uint64_t read_be64(const uint8_t* p) {
    return ((uint64_t)p[0] << 56) | ((uint64_t)p[1] << 48) |
    ((uint64_t)p[2] << 40) | ((uint64_t)p[3] << 32) |
    ((uint64_t)p[4] << 24) | ((uint64_t)p[5] << 16) |
    ((uint64_t)p[6] << 8)  |  (uint64_t)p[7];
}
inline void write_be32(uint8_t* buf, uint32_t val) {
    buf[0] = (val >> 24) & 0xFF; buf[1] = (val >> 16) & 0xFF;
    buf[2] = (val >> 8)  & 0xFF; buf[3] =  val        & 0xFF;
}
inline void write_be64(uint8_t* buf, uint64_t val) {
    for (int i = 0; i < 8; i++) buf[i] = (val >> (56 - i * 8)) & 0xFF;
}


inline size_t utf16be_raw_len(const uint8_t* data, size_t max_bytes) {
    size_t i = 0;
    while (i + 1 < max_bytes) {
        if (data[i] == 0 && data[i + 1] == 0) return i + 2;
        i += 2;
    }
    return max_bytes;
}

std::string utf16be_to_utf8(const uint8_t* data, size_t max_bytes) {
    std::string out;
    out.resize((max_bytes / 2) * 3 + 4);
    size_t o = 0, i = 0;
    while (i + 1 < max_bytes) {
        uint16_t wc = read_be16(&data[i]);
        i += 2;
        if (wc == 0) break;

        uint32_t cp = wc;
        if (wc >= 0xD800 && wc <= 0xDBFF && i + 1 < max_bytes) {
            uint16_t lo = read_be16(&data[i]);
            if (lo >= 0xDC00 && lo <= 0xDFFF) {
                cp = 0x10000u + ((uint32_t)(wc - 0xD800) << 10) + (uint32_t)(lo - 0xDC00);
                i += 2;
            } else {
                cp = 0xFFFD; 
            }
        } else if (wc >= 0xD800 && wc <= 0xDFFF) {
            cp = 0xFFFD;  
        }

        if (cp < 0x80) {
            out[o++] = (char)cp;
        } else if (cp < 0x800) {
            out[o++] = (char)(0xC0 | (cp >> 6));
            out[o++] = (char)(0x80 | (cp & 0x3F));
        } else if (cp < 0x10000) {
            out[o++] = (char)(0xE0 | (cp >> 12));
            out[o++] = (char)(0x80 | ((cp >> 6) & 0x3F));
            out[o++] = (char)(0x80 | (cp & 0x3F));
        } else {
            out[o++] = (char)(0xF0 | (cp >> 18));
            out[o++] = (char)(0x80 | ((cp >> 12) & 0x3F));
            out[o++] = (char)(0x80 | ((cp >> 6) & 0x3F));
            out[o++] = (char)(0x80 | (cp & 0x3F));
        }
    }
    out.resize(o);
    return out;
}

std::vector<uint8_t> utf8_to_utf16be(const std::string& input) {
    std::vector<uint8_t> out;
    out.reserve(input.size() * 2 + 2);
    size_t i = 0;
    while (i < input.size()) {
        unsigned char c = (unsigned char)input[i];
        uint32_t cp = 0;
        size_t len = 1;
        if      (c < 0x80)              cp = c;
        else if ((c & 0xE0) == 0xC0)   { cp = c & 0x1F; len = 2; }
        else if ((c & 0xF0) == 0xE0)   { cp = c & 0x0F; len = 3; }
        else if ((c & 0xF8) == 0xF0)   { cp = c & 0x07; len = 4; }
        else { i++; continue; }

        if (i + len > input.size()) break;
        bool ok = true;
        for (size_t k = 1; k < len; k++) {
            unsigned char cc = (unsigned char)input[i + k];
            if ((cc & 0xC0) != 0x80) { ok = false; break; }
            cp = (cp << 6) | (cc & 0x3F);
        }
        i += len;
        if (!ok) cp = 0xFFFD;

        if (cp < 0x10000) {
            out.push_back((uint8_t)(cp >> 8));
            out.push_back((uint8_t)(cp & 0xFF));
        } else if (cp <= 0x10FFFF) {
            cp -= 0x10000;
            uint16_t hi = (uint16_t)(0xD800 + (cp >> 10));
            uint16_t lo = (uint16_t)(0xDC00 + (cp & 0x3FF));
            out.push_back((uint8_t)(hi >> 8));
            out.push_back((uint8_t)(hi & 0xFF));
            out.push_back((uint8_t)(lo >> 8));
            out.push_back((uint8_t)(lo & 0xFF));
        } else {
            out.push_back(0xFF); out.push_back(0xFD);
        }
    }
    out.push_back(0); out.push_back(0);
    return out;
}

std::string escape_json(const std::string& s) {
    std::string out;
    out.reserve(s.size() + 8);
    for (unsigned char c : s) {
        switch (c) {
            case '"':  out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\b': out += "\\b";  break;
            case '\f': out += "\\f";  break;
            case '\n': out += "\\n";  break;
            case '\r': out += "\\r";  break;
            case '\t': out += "\\t";  break;
            default:
                if (c < 0x20) {
                    char buf[8];
                    std::snprintf(buf, sizeof(buf), "\\u%04X", (unsigned)c);
                    out += buf;
                } else {
                    out += (char)c;
                }
        }
    }
    return out;
}

std::string generate_offline_xuid() {
    std::random_device rd; std::mt19937 gen(rd());
    std::uniform_int_distribution<uint32_t> dis(0, 0xFFFFFFFF);
    std::stringstream ss; ss << std::uppercase << std::hex << std::setfill('0');
    ss << "E0300000" << std::setw(8) << dis(gen);
    return ss.str();
}

class Crypto {
public:
    static void rc4(uint8_t* data, size_t len, const uint8_t* key, size_t key_len) {
        uint8_t s[256]; for (int i = 0; i < 256; i++) s[i] = (uint8_t)i;
        int j = 0;
        for (int i = 0; i < 256; i++) {
            j = (j + s[i] + key[i % key_len]) % 256;
            std::swap(s[i], s[j]);
        }
        int i = 0; j = 0;
        for (size_t k = 0; k < len; k++) {
            i = (i + 1) % 256;
            j = (j + s[i]) % 256;
            std::swap(s[i], s[j]);
            data[k] ^= s[(s[i] + s[j]) % 256];
        }
    }

    static void sha1(const uint8_t* d, size_t len, uint8_t* out) {
        uint32_t h[] = { 0x67452301,0xEFCDAB89,0x98BADCFE,0x10325476,0xC3D2E1F0 };
        uint64_t ml = (uint64_t)len * 8;
        std::vector<uint8_t> m(d, d + len); m.push_back(0x80);
        while ((m.size() * 8) % 512 != 448) m.push_back(0);
        for (int i = 7; i >= 0; --i) m.push_back((ml >> (i * 8)) & 0xFF);
        auto rotl = [](uint32_t x, uint32_t n) { return (x << n) | (x >> (32 - n)); };
        for (size_t i = 0; i < m.size(); i += 64) {
            uint32_t w[80], a = h[0], b = h[1], c = h[2], dd = h[3], e = h[4];
            for (int j = 0; j < 16; ++j)
                w[j] = ((uint32_t)m[i + j*4] << 24) | ((uint32_t)m[i + j*4 + 1] << 16)
                | ((uint32_t)m[i + j*4 + 2] << 8) | (uint32_t)m[i + j*4 + 3];
            for (int j = 16; j < 80; ++j)
                w[j] = rotl(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
            for (int j = 0; j < 80; ++j) {
                uint32_t f, k;
                if      (j < 20) { f = (b & c) | ((~b) & dd); k = 0x5A827999; }
                else if (j < 40) { f = b ^ c ^ dd;              k = 0x6ED9EBA1; }
                else if (j < 60) { f = (b & c) | (b & dd) | (c & dd); k = 0x8F1BBCDC; }
                else              { f = b ^ c ^ dd;              k = 0xCA62C1D6; }
                uint32_t t = rotl(a, 5) + f + e + k + w[j];
                e = dd; dd = c; c = rotl(b, 30); b = a; a = t;
            }
            h[0]+=a; h[1]+=b; h[2]+=c; h[3]+=dd; h[4]+=e;
        }
        for (int i = 0; i < 5; ++i)
            for (int j = 0; j < 4; ++j)
                out[i*4 + j] = (h[i] >> (24 - j*8)) & 0xFF;
    }

    static void hmac_sha1(const uint8_t* k, size_t kl,
                          const uint8_t* d, size_t dl, uint8_t* out) {
        uint8_t key[64] = {0};
        if (kl > 64) sha1(k, kl, key); else memcpy(key, k, kl);
        uint8_t ip[64], op[64];
        for (int i = 0; i < 64; i++) { ip[i] = key[i] ^ 0x36; op[i] = key[i] ^ 0x5C; }
        std::vector<uint8_t> v1; v1.reserve(64 + dl);
        v1.insert(v1.end(), ip, ip + 64);
        v1.insert(v1.end(), d, d + dl);
        uint8_t h1[20]; sha1(v1.data(), v1.size(), h1);
        std::vector<uint8_t> v2; v2.reserve(84);
        v2.insert(v2.end(), op, op + 64);
        v2.insert(v2.end(), h1, h1 + 20);
        sha1(v2.data(), v2.size(), out);
                          }
};

struct XDBFEntry {
    uint16_t ns;
    uint64_t id;
    uint32_t offset;
    uint32_t length;
};

class GPDParser {
    std::vector<uint8_t> buffer;
    size_t data_start = 0;
    std::vector<XDBFEntry> entries;
    std::unordered_map<uint64_t, size_t> image_index; 
    bool valid = false;

public:
    explicit GPDParser(const std::string& path) {
        std::ifstream file(path, std::ios::binary | std::ios::ate);
        if (!file.is_open()) return;
        auto sz = file.tellg();
        if (sz < 24) return;
        size_t size = (size_t)sz;
        file.seekg(0);
        buffer.resize(size);
        if (!file.read((char*)buffer.data(), size)) { valid = false; return; }
        if (std::memcmp(buffer.data(), "XDBF", 4) != 0) return;

        uint32_t entry_tab_len = read_be32(&buffer[8]);
        uint32_t entry_count   = read_be32(&buffer[12]);
        uint32_t free_tab_len  = read_be32(&buffer[16]);

        uint64_t calc = 24ull
        + (uint64_t)entry_tab_len * 18ull
        + (uint64_t)free_tab_len  *  8ull;
        if (calc > size) return;
        data_start = (size_t)calc;

        if (entry_count > entry_tab_len) entry_count = entry_tab_len;
        if (24ull + (uint64_t)entry_count * 18ull > size) return;

        size_t cursor = 24;
        entries.reserve(entry_count);
        for (uint32_t i = 0; i < entry_count; i++) {
            XDBFEntry e;
            e.ns      = read_be16(&buffer[cursor]);
            e.id      = read_be64(&buffer[cursor + 2]);
            e.offset  = read_be32(&buffer[cursor + 10]);
            e.length  = read_be32(&buffer[cursor + 14]);
            if ((uint64_t)data_start + e.offset + e.length <= size)
                entries.push_back(e);
            cursor += 18;
        }

        for (size_t i = 0; i < entries.size(); i++) {
            if (entries[i].ns == 2) image_index[entries[i].id] = i;
        }
        valid = true;
    }

    bool is_valid() const { return valid; }

    int calculate_total_gamerscore() const {
        if (!valid) return 0;
        int total = 0;
        for (const auto& e : entries) {
            if (e.ns != 4) continue;
            size_t base = data_start + e.offset;
            if (base + 0x14 > buffer.size()) continue;
            int32_t unlocked = (int32_t)read_be32(&buffer[base + 0x10]);
            if (unlocked > 0 && unlocked <= 2000) total += unlocked;
        }
        return total;
    }

    void dump_achievements_with_images(const std::string& image_out_dir) const {
        std::cout << "[";
        if (!valid) { std::cout << "]" << std::endl; return; }
        if (!image_out_dir.empty() && !fs::exists(image_out_dir)) {
            try { fs::create_directories(image_out_dir); } catch (...) {}
        }

        bool first = true;
        for (const auto& entry : entries) {
            if (entry.ns != 1) continue;  

            size_t base      = data_start + entry.offset;
            size_t entry_end = base + entry.length;
            if (base + 0x1C > entry_end || entry_end > buffer.size()) continue;

            uint32_t achieve_id = (uint32_t)entry.id;
            uint32_t image_id   = read_be32(&buffer[base + 0x08]);
            int32_t  score      = (int32_t)read_be32(&buffer[base + 0x0C]);
            uint32_t flags      = read_be32(&buffer[base + 0x10]);
            bool is_unlocked    = (flags & 0x30000u) != 0;

            size_t str_cursor = base + 0x1C;
            if (str_cursor + 2 > entry_end) continue;

            size_t name_max = std::min<size_t>(0x100, entry_end - str_cursor);
            std::string name = utf16be_to_utf8(&buffer[str_cursor], name_max);
            size_t name_bytes = utf16be_raw_len(&buffer[str_cursor], name_max);

            size_t locked_off = str_cursor + name_bytes;
            if (locked_off + 2 > entry_end) continue;
            size_t locked_max = std::min<size_t>(0x400, entry_end - locked_off);
            std::string desc_locked = utf16be_to_utf8(&buffer[locked_off], locked_max);
            size_t locked_bytes = utf16be_raw_len(&buffer[locked_off], locked_max);

            size_t unlocked_off = locked_off + locked_bytes;
            if (unlocked_off + 2 > entry_end) continue;
            size_t unlocked_max = std::min<size_t>(0x400, entry_end - unlocked_off);
            std::string desc_unlocked = utf16be_to_utf8(&buffer[unlocked_off], unlocked_max);

            std::string final_desc = is_unlocked ? desc_unlocked : desc_locked;

            std::string img_filename;
            auto it = image_index.find((uint64_t)image_id);
            if (it != image_index.end()) {
                const auto& img_entry = entries[it->second];
                if (img_entry.length > 0) {
                    std::string fname = std::to_string(achieve_id) + ".png";
                    std::string full_path = image_out_dir.empty()
                    ? fname
                    : (image_out_dir + "/" + fname);
                    if (!fs::exists(full_path)) {
                        std::ofstream img_file(full_path, std::ios::binary);
                        if (img_file) {
                            img_file.write(
                                (const char*)&buffer[data_start + img_entry.offset],
                                           img_entry.length);
                        }
                    }
                    img_filename = fname;
                }
            }

            if (!first) std::cout << ",";
            std::cout << "{\"id\": " << achieve_id
            << ", \"name\": \"" << escape_json(name) << "\""
            << ", \"description\": \"" << escape_json(final_desc) << "\""
            << ", \"score\": " << score
            << ", \"unlocked\": " << (is_unlocked ? "true" : "false")
            << ", \"image_path\": \"" << escape_json(img_filename) << "\"}";
            first = false;
        }
        std::cout << "]" << std::endl;
    }
};

static const uint8_t MASTER_KEY[] = {
    0xE1, 0xBC, 0x15, 0x9C, 0x73, 0xB1, 0xEA, 0xE9,
    0xAB, 0x31, 0x70, 0xF3, 0xAD, 0x47, 0xEB, 0xF3
};
static const size_t ACCOUNT_FILE_SIZE = 404;

void cmd_create_profile(std::string gamertag, std::string output_base_path) {
    std::string xuid_str = generate_offline_xuid();
    uint64_t xuid = std::stoull(xuid_str, nullptr, 16);

    fs::path base_path = output_base_path;
    fs::path final_folder = base_path / xuid_str / "FFFE07D1" / "00010000" / xuid_str;

    try { fs::create_directories(final_folder); }
    catch (...) {
        std::cout << "{\"success\": false, \"error\": \"Could not create directories\"}"
        << std::endl;
        return;
    }

    std::vector<uint8_t> buffer(ACCOUNT_FILE_SIZE, 0);
    uint8_t* struct_start = &buffer[0x18];

    struct_start[0x00] = 0x20; 

    std::vector<uint8_t> gt_bytes = utf8_to_utf16be(gamertag);
    if (gt_bytes.size() > 0x1E) gt_bytes.resize(0x1E);
    memcpy(&struct_start[0x08], gt_bytes.data(), gt_bytes.size());

    write_be64(&struct_start[0x28], xuid);
    struct_start[0x31] = 0x60;                  
    memcpy(&struct_start[0x34], "PROD", 4);    
    memset(&buffer[0x10], 0xFD, 8);

    uint8_t data_hash[20];
    Crypto::hmac_sha1(MASTER_KEY, 16, &buffer[0x10],
                      ACCOUNT_FILE_SIZE - 16, data_hash);
    memcpy(&buffer[0x00], data_hash, 0x10);

    uint8_t rc4_key[20];
    Crypto::hmac_sha1(MASTER_KEY, 16, data_hash, 0x10, rc4_key);
    Crypto::rc4(&buffer[0x10], ACCOUNT_FILE_SIZE - 16, rc4_key, 16);

    std::ofstream acc_file(final_folder / "Account", std::ios::binary);
    if (!acc_file) {
        std::cout << "{\"success\": false, \"error\": \"Failed to write Account file\"}"
        << std::endl;
        return;
    }
    acc_file.write((char*)buffer.data(), buffer.size());
    acc_file.close();

    std::cout << "{\"success\": true, \"gamertag\": \"" << escape_json(gamertag)
    << "\", \"xuid\": \"0x" << xuid_str
    << "\", \"path\": \"" << escape_json(final_folder.string()) << "\"}"
    << std::endl;
}

void cmd_read_account(std::string account_path) {
    std::ifstream f(account_path, std::ios::binary);
    if (!f) {
        std::cout << "{\"success\": false, \"error\": \"Account file not found\"}"
        << std::endl;
        return;
    }
    std::vector<uint8_t> buffer(ACCOUNT_FILE_SIZE);
    if (!f.read((char*)buffer.data(), ACCOUNT_FILE_SIZE)) {
        std::cout << "{\"success\": false, \"error\": \"Failed to read Account file\"}"
        << std::endl;
        return;
    }
    f.close();

    uint8_t rc4_key[20];
    Crypto::hmac_sha1(MASTER_KEY, 16, buffer.data(), 16, rc4_key);
    Crypto::rc4(&buffer[0x10], ACCOUNT_FILE_SIZE - 16, rc4_key, 16);

    uint8_t* struct_start = &buffer[0x18];
    std::string gamertag = utf16be_to_utf8(&struct_start[0x08], 0x1E);
    uint64_t xuid_raw = read_be64(&struct_start[0x28]);

    std::stringstream ss;
    ss << std::uppercase << std::hex << std::setfill('0')
    << std::setw(16) << xuid_raw;
    std::cout << "{" << "\"success\": true, "
    << "\"gamertag\": \"" << escape_json(gamertag) << "\", "
    << "\"xuid\": \"0x" << ss.str() << "\"" << "}" << std::endl;
}

void cmd_rename_profile(std::string account_path, std::string new_gamertag) {
    std::ifstream f_in(account_path, std::ios::binary);
    if (!f_in) {
        std::cout << "{\"success\": false, \"error\": \"Account file not found\"}"
        << std::endl;
        return;
    }
    std::vector<uint8_t> buffer(ACCOUNT_FILE_SIZE);
    if (!f_in.read((char*)buffer.data(), ACCOUNT_FILE_SIZE)) {
        std::cout << "{\"success\": false, \"error\": \"Failed to read Account file\"}"
        << std::endl;
        return;
    }
    f_in.close();

    uint8_t rc4_key_old[20];
    Crypto::hmac_sha1(MASTER_KEY, 16, buffer.data(), 16, rc4_key_old);
    Crypto::rc4(&buffer[0x10], ACCOUNT_FILE_SIZE - 16, rc4_key_old, 16);

    uint8_t* struct_start = &buffer[0x18];
    memset(&struct_start[0x08], 0, 0x1E);
    std::vector<uint8_t> gt_bytes = utf8_to_utf16be(new_gamertag);
    if (gt_bytes.size() > 0x1E) gt_bytes.resize(0x1E);
    memcpy(&struct_start[0x08], gt_bytes.data(), gt_bytes.size());

    uint8_t new_data_hash[20];
    Crypto::hmac_sha1(MASTER_KEY, 16, &buffer[0x10],
                      ACCOUNT_FILE_SIZE - 16, new_data_hash);
    memcpy(&buffer[0x00], new_data_hash, 0x10);

    uint8_t rc4_key_new[20];
    Crypto::hmac_sha1(MASTER_KEY, 16, new_data_hash, 0x10, rc4_key_new);
    Crypto::rc4(&buffer[0x10], ACCOUNT_FILE_SIZE - 16, rc4_key_new, 16);

    std::ofstream f_out(account_path, std::ios::binary);
    if (!f_out) {
        std::cout << "{\"success\": false, \"error\": \"Failed to save Account file\"}"
        << std::endl;
        return;
    }
    f_out.write((char*)buffer.data(), buffer.size());
    f_out.close();

    std::cout << "{\"success\": true, \"new_gamertag\": \""
    << escape_json(new_gamertag) << "\"}" << std::endl;
}

void cmd_scan_path(std::string scan_path) {
    if (!fs::exists(scan_path)) { std::cout << "[]" << std::endl; return; }

    std::cout << "[";
    bool first = true;

    for (const auto& xuid_entry : fs::directory_iterator(scan_path)) {
        if (!xuid_entry.is_directory()) continue;
        std::string xuid = xuid_entry.path().filename().string();
        fs::path account_file = xuid_entry.path() / "FFFE07D1"
        / "00010000" / xuid / "Account";
        if (!fs::exists(account_file)) continue;

        std::vector<uint8_t> buffer(ACCOUNT_FILE_SIZE);
        std::ifstream f(account_file, std::ios::binary);
        if (!f.read((char*)buffer.data(), ACCOUNT_FILE_SIZE)) continue;
        f.close();

        uint8_t rc4_key[20];
        Crypto::hmac_sha1(MASTER_KEY, 16, buffer.data(), 16, rc4_key);
        Crypto::rc4(&buffer[0x10], ACCOUNT_FILE_SIZE - 16, rc4_key, 16);

        std::string gamertag = utf16be_to_utf8(&buffer[0x18 + 0x08], 0x1E);

        fs::path profile_gpd_path = xuid_entry.path() / "FFFE07D1"
        / "00010000" / xuid / "FFFE07D1.gpd";
        int total_score = 0;
        if (fs::exists(profile_gpd_path)) {
            GPDParser parser(profile_gpd_path.string());
            total_score = parser.calculate_total_gamerscore();
        }

        if (!first) std::cout << ",";
        std::cout << "{" << "\"xuid\": \"" << xuid << "\", "
        << "\"gamertag\": \"" << escape_json(gamertag) << "\", "
        << "\"total_gamerscore\": " << total_score << "}";
        first = false;
    }
    std::cout << "]" << std::endl;
}

int main(int argc, char* argv[]) {
    #ifdef _WIN32
    SetConsoleOutputCP(CP_UTF8);  
    #endif

    if (argc < 2) {
        std::cout << "Xenia Toolbox CLI\n";
        std::cout << "Usage:\n";
        std::cout << "  create <gamertag> <dest_path>          : Create profile\n";
        std::cout << "  read <account_file_path>               : Read specific account\n";
        std::cout << "  rename <account_file_path> <new_tag>   : Rename profile\n";
        std::cout << "  scan <content_path>                    : Scan folder for profiles\n";
        std::cout << "  achievements <gpd_path> <img_out_dir>  : Parse GPD\n";
        return 1;
    }

    std::string mode = argv[1];
    if (mode == "create" && argc >= 4)       cmd_create_profile(argv[2], argv[3]);
    else if (mode == "read" && argc >= 3)    cmd_read_account(argv[2]);
    else if (mode == "rename" && argc >= 4)  cmd_rename_profile(argv[2], argv[3]);
    else if (mode == "scan" && argc >= 3)    cmd_scan_path(argv[2]);
    else if (mode == "achievements" && argc >= 4) {
        GPDParser gpd(argv[2]);
        gpd.dump_achievements_with_images(argv[3]);
    } else {
        std::cout << "{\"success\": false, \"error\": \"Invalid arguments\"}"
        << std::endl;
        return 1;
    }
    return 0;
}
