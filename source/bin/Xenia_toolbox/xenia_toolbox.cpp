
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

namespace fs = std::filesystem;

inline void write_be32(uint8_t* buf, uint32_t val) {
    buf[0] = (val >> 24) & 0xFF; buf[1] = (val >> 16) & 0xFF;
    buf[2] = (val >> 8) & 0xFF;  buf[3] = val & 0xFF;
}

inline void write_be64(uint8_t* buf, uint64_t val) {
    for (int i = 0; i < 8; i++) buf[i] = (val >> (56 - i * 8)) & 0xFF;
}

inline uint32_t swap32(uint32_t v) { return __builtin_bswap32(v); }
inline uint64_t swap64(uint64_t v) { return __builtin_bswap64(v); }
inline uint16_t swap16(uint16_t v) { return (v << 8) | (v >> 8); }

std::string escape_json(const std::string& s) {
    std::string out;
    for (char c : s) {
        if (c == '"') out += "\\\"";
        else if (c == '\\') out += "\\\\";
        else if (c < 0x20) {}
        else out += c;
    }
    return out;
}

std::string generate_offline_xuid() {
    std::random_device rd; std::mt19937 gen(rd());
    std::uniform_int_distribution<uint32_t> dis(0, 0xFFFFFFFF);
    std::stringstream ss; ss << std::uppercase << std::hex << std::setfill('0');
    ss << "E0300000" << std::setw(8) << dis(gen); return ss.str();
}

std::vector<uint8_t> ascii_to_utf16_be(const std::string& input) {
    std::vector<uint8_t> out;
    for (char c : input) { out.push_back(0); out.push_back((uint8_t)c); }
    out.push_back(0); out.push_back(0); return out;
}

std::string read_utf16_be_string(const uint8_t* data, size_t max_bytes) {
    std::string out;
    for (size_t i = 0; i < max_bytes; i += 2) {
        uint16_t wc = (data[i] << 8) | data[i+1];
        if (wc == 0) break;
        if (wc >= 32 && wc <= 126) out += (char)wc;
        else if (wc > 0x7F) out += '?';
    }
    return out;
}

class Crypto {
public:
    static void rc4(uint8_t* data, size_t len, const uint8_t* key, size_t key_len) {
        uint8_t s[256]; for (int i = 0; i < 256; i++) s[i] = i;
        int j = 0; for (int i = 0; i < 256; i++) { j = (j + s[i] + key[i % key_len]) % 256; std::swap(s[i], s[j]); }
        int i = 0; j = 0; for (size_t k = 0; k < len; k++) { i = (i + 1) % 256; j = (j + s[i]) % 256; std::swap(s[i], s[j]); data[k] ^= s[(s[i] + s[j]) % 256]; }
    }
    static void sha1(const uint8_t* d, size_t len, uint8_t* out) {
        uint32_t h[] = { 0x67452301,0xEFCDAB89,0x98BADCFE,0x10325476,0xC3D2E1F0 };
        uint64_t ml = len * 8; std::vector<uint8_t> m(d, d + len); m.push_back(0x80);
        while ((m.size() * 8) % 512 != 448) m.push_back(0);
        for (int i = 7; i >= 0; --i) m.push_back((ml >> (i * 8)) & 0xFF);
        auto rotl = [](uint32_t x, uint32_t n) { return (x << n) | (x >> (32 - n)); };
        for (size_t i = 0; i < m.size(); i += 64) {
            uint32_t w[80], a = h[0], b = h[1], c = h[2], d = h[3], e = h[4];
            for (int j = 0; j < 16; ++j) w[j] = (m[i + j * 4] << 24) | (m[i + j * 4 + 1] << 16) | (m[i + j * 4 + 2] << 8) | m[i + j * 4 + 3];
            for (int j = 16; j < 80; ++j) w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
            for (int j = 0; j < 80; ++j) {
                uint32_t f, k;
                if (j < 20) { f = (b & c) | ((~b) & d); k = 0x5A827999; }
                else if (j < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
                else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
                else { f = b ^ c ^ d; k = 0xCA62C1D6; }
                uint32_t t = rotl(a, 5) + f + e + k + w[j];
                e = d; d = c; c = rotl(b, 30); b = a; a = t;
            } h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e;
        }
        for (int i = 0; i < 5; ++i) for (int j = 0; j < 4; ++j) out[i * 4 + j] = (h[i] >> (24 - j * 8)) & 0xFF;
    }
    static void hmac_sha1(const uint8_t* k, size_t kl, const uint8_t* d, size_t dl, uint8_t* out) {
        uint8_t key[64] = { 0 }; if (kl > 64) sha1(k, kl, key); else memcpy(key, k, kl);
        uint8_t ip[64], op[64]; for (int i = 0; i < 64; i++) { ip[i] = key[i] ^ 0x36; op[i] = key[i] ^ 0x5C; }
        std::vector<uint8_t> v1; v1.insert(v1.end(), ip, ip + 64); v1.insert(v1.end(), d, d + dl);
        uint8_t h1[20]; sha1(v1.data(), v1.size(), h1);
        std::vector<uint8_t> v2; v2.insert(v2.end(), op, op + 64); v2.insert(v2.end(), h1, h1 + 20);
        sha1(v2.data(), v2.size(), out);
    }
};

struct XDBFEntry {
    uint16_t ns; uint64_t id; uint32_t offset; uint32_t length;
};

class GPDParser {
    std::vector<uint8_t> buffer;
    size_t data_start = 0;
    std::vector<XDBFEntry> entries;
    bool valid = false;

public:
    GPDParser(std::string path) {
        std::ifstream file(path, std::ios::binary | std::ios::ate);
        if (!file.is_open()) return;
        size_t size = file.tellg();
        file.seekg(0);
        buffer.resize(size);
        file.read((char*)buffer.data(), size);
        if (size < 24 || std::string((char*)buffer.data(), 4) != "XDBF") return;
        uint32_t entry_tab_len = swap32(*(uint32_t*)&buffer[8]);
        uint32_t entry_count = swap32(*(uint32_t*)&buffer[12]);
        uint32_t free_tab_len = swap32(*(uint32_t*)&buffer[16]);
        data_start = 24 + (entry_tab_len * 18) + (free_tab_len * 8);
        size_t cursor = 24;
        for(uint32_t i = 0; i < entry_count; i++) {
            XDBFEntry e;
            e.ns = swap16(*(uint16_t*)&buffer[cursor]);
            e.id = swap64(*(uint64_t*)&buffer[cursor+2]);
            e.offset = swap32(*(uint32_t*)&buffer[cursor+10]);
            e.length = swap32(*(uint32_t*)&buffer[cursor+14]);
            if (data_start + e.offset + e.length <= buffer.size()) entries.push_back(e);
            cursor += 18;
        }
        valid = true;
    }

    int calculate_total_gamerscore() {
        if(!valid) return 0;
        int total = 0;
        for (const auto& entry : entries) {
            if(entry.ns == 4) {
                size_t base = data_start + entry.offset;
                if (base + 0x20 <= buffer.size()) {
                    int32_t unlocked = (int32_t)swap32(*(uint32_t*)&buffer[base + 0x10]);
                    if(unlocked > 0 && unlocked <= 2000) total += unlocked;
                }
            }
        }
        return total;
    }

void dump_achievements_with_images(const std::string& image_out_dir) {
        std::cout << "[";
        if (!valid) { std::cout << "]" << std::endl; return; }
        if (!fs::exists(image_out_dir)) try { fs::create_directories(image_out_dir); } catch (...) {}

        bool first = true;
        for (const auto& entry : entries) {
            if (entry.ns == 1) {
                size_t base = data_start + entry.offset;
                uint32_t achieve_id = (uint32_t)entry.id;
                uint32_t image_id = swap32(*(uint32_t*)&buffer[base + 0x8]);
                uint32_t score = swap32(*(uint32_t*)&buffer[base + 0xC]);
                uint32_t flags = swap32(*(uint32_t*)&buffer[base + 0x10]);
                bool is_unlocked = (flags & 0x30000) != 0;

                size_t str_cursor = base + 0x1C;
                

                std::string name = read_utf16_be_string(&buffer[str_cursor], 0x100);
                size_t name_bytes = (name.length() * 2) + 2;

               
                std::string desc_locked = read_utf16_be_string(&buffer[str_cursor + name_bytes], 0x400);
                size_t desc_l_bytes = (desc_locked.length() * 2) + 2;

               
                std::string desc_unlocked = read_utf16_be_string(&buffer[str_cursor + name_bytes + desc_l_bytes], 0x400);
                
                std::string final_desc = is_unlocked ? desc_unlocked : desc_locked;

                std::string img_filename = "";
                for (const auto& img_entry : entries) {
                    if (img_entry.ns == 2 && img_entry.id == image_id) {
                        std::string fname = std::to_string(achieve_id) + ".png";
                        std::string full_path = image_out_dir + "/" + fname;
                        if (!fs::exists(full_path)) {
                            std::ofstream img_file(full_path, std::ios::binary);
                            img_file.write((char*)&buffer[data_start + img_entry.offset], img_entry.length);
                        }
                        img_filename = fname;
                        break;
                    }
                }

                if (!first) std::cout << ",";
                std::cout << "{" << "\"id\": " << achieve_id << "," << "\"name\": \"" << escape_json(name) << "\"," << "\"description\": \"" << escape_json(final_desc) << "\"," << "\"score\": " << score << "," << "\"unlocked\": " << (is_unlocked ? "true" : "false") << "," << "\"image_path\": \"" << escape_json(img_filename) << "\"" << "}";
                first = false;
            }
        }
        std::cout << "]" << std::endl;
    }
};

void cmd_create_profile(std::string gamertag, std::string output_base_path) {
    const uint8_t MASTER_KEY[] = { 0xE1, 0xBC, 0x15, 0x9C, 0x73, 0xB1, 0xEA, 0xE9, 0xAB, 0x31, 0x70, 0xF3, 0xAD, 0x47, 0xEB, 0xF3 };
    const size_t FILE_SIZE = 404;
    
    std::string xuid_str = generate_offline_xuid();
    uint64_t xuid = std::stoull(xuid_str, nullptr, 16);

    fs::path base_path = output_base_path;
    fs::path final_folder = base_path / xuid_str / "FFFE07D1" / "00010000" / xuid_str;
    
    try {
        fs::create_directories(final_folder);
    } catch (...) { 
        std::cout << "{\"success\": false, \"error\": \"Could not create directories at the specified path\"}" << std::endl; 
        return; 
    }

    std::vector<uint8_t> buffer(FILE_SIZE, 0);
    uint8_t* struct_start = &buffer[0x18];

    struct_start[0x00] = 0x20; 
    std::vector<uint8_t> gt_bytes = ascii_to_utf16_be(gamertag);
    if (gt_bytes.size() > 0x1E) gt_bytes.resize(0x1E);
    memcpy(&struct_start[0x08], gt_bytes.data(), gt_bytes.size());

    write_be64(&struct_start[0x28], xuid);
    struct_start[0x31] = 0x60;
    memcpy(&struct_start[0x34], "PROD", 4);
    memset(&buffer[0x10], 0xFD, 8);

    uint8_t data_hash[20];
    Crypto::hmac_sha1(MASTER_KEY, 16, &buffer[0x10], FILE_SIZE - 16, data_hash);
    memcpy(&buffer[0x00], data_hash, 0x10);

    uint8_t rc4_key[20];
    Crypto::hmac_sha1(MASTER_KEY, 16, data_hash, 0x10, rc4_key);
    Crypto::rc4(&buffer[0x10], FILE_SIZE - 16, rc4_key, 16);

    std::ofstream acc_file(final_folder / "Account", std::ios::binary);
    if (!acc_file) { std::cout << "{\"success\": false, \"error\": \"Failed to write Account file\"}" << std::endl; return; }
    acc_file.write((char*)buffer.data(), buffer.size());
    acc_file.close();

    std::cout << "{\"success\": true, \"gamertag\": \"" << gamertag << "\", \"xuid\": \"0x" << xuid_str << "\", \"path\": \"" << escape_json(final_folder.string()) << "\"}" << std::endl;
}

void cmd_read_account(std::string account_path) {
    const uint8_t MASTER_KEY[] = { 0xE1, 0xBC, 0x15, 0x9C, 0x73, 0xB1, 0xEA, 0xE9, 0xAB, 0x31, 0x70, 0xF3, 0xAD, 0x47, 0xEB, 0xF3 };
    const size_t FILE_SIZE = 404;

    std::ifstream f(account_path, std::ios::binary);
    if (!f) { std::cout << "{\"success\": false, \"error\": \"Account file not found\"}" << std::endl; return; }
    
    std::vector<uint8_t> buffer(FILE_SIZE);
    f.read((char*)buffer.data(), FILE_SIZE);
    f.close();

    uint8_t rc4_key[20];
    Crypto::hmac_sha1(MASTER_KEY, 16, buffer.data(), 16, rc4_key);
    Crypto::rc4(&buffer[0x10], FILE_SIZE - 16, rc4_key, 16);

    uint8_t* struct_start = &buffer[0x18];
    std::string gamertag = read_utf16_be_string(&struct_start[0x08], 0x1E);
    uint64_t xuid_raw = swap64(*(uint64_t*)&struct_start[0x28]);
    
    std::stringstream ss; ss << std::uppercase << std::hex << std::setfill('0') << std::setw(16) << xuid_raw;
    std::cout << "{" << "\"success\": true, " << "\"gamertag\": \"" << escape_json(gamertag) << "\", " << "\"xuid\": \"0x" << ss.str() << "\"" << "}" << std::endl;
}

void cmd_scan_path(std::string scan_path) {
    if (!fs::exists(scan_path)) { std::cout << "[]" << std::endl; return; }

    std::cout << "[";
    bool first = true;

    for (const auto& xuid_entry : fs::directory_iterator(scan_path)) {
        if (!xuid_entry.is_directory()) continue;
        
        std::string xuid = xuid_entry.path().filename().string();
        fs::path account_file = xuid_entry.path() / "FFFE07D1" / "00010000" / xuid / "Account";
        
        if (fs::exists(account_file)) {
            const uint8_t MASTER_KEY[] = { 0xE1, 0xBC, 0x15, 0x9C, 0x73, 0xB1, 0xEA, 0xE9, 0xAB, 0x31, 0x70, 0xF3, 0xAD, 0x47, 0xEB, 0xF3 };
            const size_t FILE_SIZE = 404;
            
            std::vector<uint8_t> buffer(FILE_SIZE);
            std::ifstream f(account_file, std::ios::binary);
            f.read((char*)buffer.data(), FILE_SIZE);
            f.close();

            uint8_t rc4_key[20];
            Crypto::hmac_sha1(MASTER_KEY, 16, buffer.data(), 16, rc4_key);
            Crypto::rc4(&buffer[0x10], FILE_SIZE - 16, rc4_key, 16);

            std::string gamertag = read_utf16_be_string(&buffer[0x18 + 0x08], 0x1E);

            fs::path profile_gpd_path = xuid_entry.path() / "FFFE07D1" / "00010000" / xuid / "FFFE07D1.gpd";
            int total_score = 0;
            if (fs::exists(profile_gpd_path)) {
                GPDParser parser(profile_gpd_path.string());
                total_score = parser.calculate_total_gamerscore();
            }

            if(!first) std::cout << ",";
            std::cout << "{" << "\"xuid\": \"" << xuid << "\", " << "\"gamertag\": \"" << escape_json(gamertag) << "\", " << "\"total_gamerscore\": " << total_score << "}";
            first = false;
        }
    }
    std::cout << "]" << std::endl;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cout << "Xenia Toolbox CLI" << std::endl;
        std::cout << "Usage:" << std::endl;
        std::cout << "  create <gamertag> <dest_path>          : Create profile in specific path" << std::endl;
        std::cout << "  read <account_file_path>               : Read specific account file" << std::endl;
        std::cout << "  scan <content_path>                    : Scan a folder for profiles" << std::endl;
        std::cout << "  achievements <gpd_path> <img_out_dir>  : Parse GPD file" << std::endl;
        return 1;
    }

    std::string mode = argv[1];

    if (mode == "create" && argc >= 4) {
        cmd_create_profile(argv[2], argv[3]);
    }
    else if (mode == "read" && argc >= 3) {
        cmd_read_account(argv[2]);
    }
    else if (mode == "scan" && argc >= 3) {
        cmd_scan_path(argv[2]);
    }
    else if (mode == "achievements" && argc >= 4) {
        GPDParser gpd(argv[2]);
        gpd.dump_achievements_with_images(argv[3]);
    }
    else {
        std::cout << "{\"success\": false, \"error\": \"Invalid arguments or command\"}" << std::endl;
        return 1;
    }

    return 0;
}
