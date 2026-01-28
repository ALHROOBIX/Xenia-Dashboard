
#define SDL_MAIN_HANDLED

#include <SDL3/SDL.h>
#include <iostream>
#include <string>
#include <cmath>
#include <thread>
#include <iomanip>


const int STICK_DEADZONE = 6000;
const float AXIS_THRESHOLD = 0.05f;


struct DpadState {
    bool up = false;
    bool down = false;
    bool left = false;
    bool right = false;
} dpad_state;


struct LastSent {
    int dpad_x = 0;
    int dpad_y = 0;
    float left_x = 0.0f;
    float left_y = 0.0f;
    float right_x = 0.0f;
    float right_y = 0.0f;
    float trigger_l = 0.0f;
    float trigger_r = 0.0f;
} last_sent;


template <typename T>
void send_json(std::string event, T value) {
    std::cout << "{\"event\": \"" << event << "\", \"value\": " << value << "}" << std::endl;
}


void parent_watchdog() {
    char c;
    while (std::cin >> c) {}
    exit(0);
}


float process_axis(Sint16 value, bool invert = false) {
    if (std::abs(value) < STICK_DEADZONE) return 0.0f;
    float norm = value / 32767.0f;
    if (invert) norm = -norm;
    return std::round(norm * 100.0f) / 100.0f;
}

float process_trigger(Sint16 value) {
    return std::round((value / 32767.0f) * 100.0f) / 100.0f;
}


std::string get_button_name(Uint8 button) {
    switch (button) {
        case SDL_GAMEPAD_BUTTON_SOUTH: return "button_a";
        case SDL_GAMEPAD_BUTTON_EAST:  return "button_b";
        case SDL_GAMEPAD_BUTTON_WEST:  return "button_x";
        case SDL_GAMEPAD_BUTTON_NORTH: return "button_y";
        case SDL_GAMEPAD_BUTTON_BACK:  return "button_back";
        case SDL_GAMEPAD_BUTTON_GUIDE: return "button_guide";
        case SDL_GAMEPAD_BUTTON_START: return "button_start";
        case SDL_GAMEPAD_BUTTON_LEFT_STICK:  return "button_left_thumb";
        case SDL_GAMEPAD_BUTTON_RIGHT_STICK: return "button_right_thumb";
        case SDL_GAMEPAD_BUTTON_LEFT_SHOULDER: return "button_left_bumper";
        case SDL_GAMEPAD_BUTTON_RIGHT_SHOULDER: return "button_right_bumper";
        default: return "";
    }
}

int main(int argc, char* argv[]) {
    std::thread(parent_watchdog).detach();
    std::setbuf(stdout, NULL);

    if (!SDL_Init(SDL_INIT_GAMEPAD)) {
        send_json("error", "SDL3 Init Failed: " + std::string(SDL_GetError()));
        return 1;
    }

    send_json("status", "SDL3 Input Engine Started");

    SDL_Gamepad* gamepad = nullptr;
    SDL_Event e;
    bool running = true;
    SDL_JoystickID my_joystick_id = 0;

    while (running) {
        while (SDL_PollEvent(&e)) {
            switch (e.type) {
                case SDL_EVENT_GAMEPAD_ADDED:
                    if (!gamepad) {
                        gamepad = SDL_OpenGamepad(e.gdevice.which);
                        if (gamepad) {
                            my_joystick_id = SDL_GetGamepadID(gamepad);
                            send_json("status", "Gamepad Connected: " + std::string(SDL_GetGamepadName(gamepad)));
                        }
                    }
                    break;

                case SDL_EVENT_GAMEPAD_REMOVED:
                    if (gamepad && e.gdevice.which == my_joystick_id) {
                        SDL_CloseGamepad(gamepad);
                        gamepad = nullptr;
                        my_joystick_id = 0;
                        send_json("status", "Disconnected");
                    }
                    break;

                case SDL_EVENT_GAMEPAD_BUTTON_DOWN:
                case SDL_EVENT_GAMEPAD_BUTTON_UP:
                {
                    if (gamepad && e.gbutton.which == my_joystick_id) {
                        bool is_pressed = e.gbutton.down;
                        Uint8 btn = e.gbutton.button;

                        if (btn == SDL_GAMEPAD_BUTTON_DPAD_UP || btn == SDL_GAMEPAD_BUTTON_DPAD_DOWN ||
                            btn == SDL_GAMEPAD_BUTTON_DPAD_LEFT || btn == SDL_GAMEPAD_BUTTON_DPAD_RIGHT) {

                            if (btn == SDL_GAMEPAD_BUTTON_DPAD_UP) dpad_state.up = is_pressed;
                            if (btn == SDL_GAMEPAD_BUTTON_DPAD_DOWN) dpad_state.down = is_pressed;
                            if (btn == SDL_GAMEPAD_BUTTON_DPAD_LEFT) dpad_state.left = is_pressed;
                            if (btn == SDL_GAMEPAD_BUTTON_DPAD_RIGHT) dpad_state.right = is_pressed;

                            int new_dx = (dpad_state.right ? 1 : 0) - (dpad_state.left ? 1 : 0);
                            int new_dy = (dpad_state.down ? 1 : 0) - (dpad_state.up ? 1 : 0);

                        if (new_dx != last_sent.dpad_x) {
                            last_sent.dpad_x = new_dx;
                            send_json("dpad_x", new_dx);
                        }
                        if (new_dy != last_sent.dpad_y) {
                            last_sent.dpad_y = new_dy;
                            send_json("dpad_y", new_dy);
                        }
                            }
                            else {
                                std::string btn_name = get_button_name(btn);
                                if (!btn_name.empty()) {
                                    send_json(btn_name, is_pressed ? 1 : 0);
                                }
                            }
                    }
                    break;
                }

                case SDL_EVENT_GAMEPAD_AXIS_MOTION:
                {
                    if (gamepad && e.gaxis.which == my_joystick_id) {
                        float val = 0.0f;
                        switch (e.gaxis.axis) {
                            case SDL_GAMEPAD_AXIS_LEFTX:
                                val = process_axis(e.gaxis.value);
                                if (val != last_sent.left_x) {
                                    last_sent.left_x = val;
                                    send_json("left_stick_x", val);
                                }
                                break;
                            case SDL_GAMEPAD_AXIS_LEFTY:
                                val = process_axis(e.gaxis.value, true);
                                if (val != last_sent.left_y) {
                                    last_sent.left_y = val;
                                    send_json("left_stick_y", val);
                                }
                                break;
                            case SDL_GAMEPAD_AXIS_RIGHTX:
                                val = process_axis(e.gaxis.value);
                                if (val != last_sent.right_x) {
                                    last_sent.right_x = val;
                                    send_json("right_stick_x", val);
                                }
                                break;
                            case SDL_GAMEPAD_AXIS_RIGHTY:
                                val = process_axis(e.gaxis.value, true);
                                if (val != last_sent.right_y) {
                                    last_sent.right_y = val;
                                    send_json("right_stick_y", val);
                                }
                                break;
                            case SDL_GAMEPAD_AXIS_LEFT_TRIGGER:
                                val = process_trigger(e.gaxis.value);
                                if (val != last_sent.trigger_l) {
                                    last_sent.trigger_l = val;
                                    send_json("left_trigger", val);
                                }
                                break;
                            case SDL_GAMEPAD_AXIS_RIGHT_TRIGGER:
                                val = process_trigger(e.gaxis.value);
                                if (val != last_sent.trigger_r) {
                                    last_sent.trigger_r = val;
                                    send_json("right_trigger", val);
                                }
                                break;
                        }
                    }
                    break;
                }
            }
        }
        SDL_Delay(10);
    }

    if (gamepad) SDL_CloseGamepad(gamepad);
    SDL_Quit();
    return 0;
}
