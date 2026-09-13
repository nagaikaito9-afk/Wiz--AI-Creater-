// ============================================================================
// Wiz AI Game Creator - C++ Game Logic Engine Core
// Designed for high-performance physics, collision calculations and Wasm integration
// ============================================================================

#include <iostream>
#include <vector>
#include <cmath>
#include <string>

// 2D Vector Structure
struct Vec2 {
    float x;
    float y;

    Vec2(float _x = 0.0f, float _y = 0.0f) : x(_x), y(_y) {}

    Vec2 operator+(const Vec2& other) const { return Vec2(x + other.x, y + other.y); }
    Vec2 operator-(const Vec2& other) const { return Vec2(x - other.x, y - other.y); }
    Vec2 operator*(float scalar) const { return Vec2(x * scalar, y * scalar); }

    float length() const { return std::sqrt(x * x + y * y); }
};

// Physics Entity for Games
class GameEntity {
public:
    std::string name;
    Vec2 position;
    Vec2 velocity;
    float radius;
    bool isActive;

    GameEntity(const std::string& n, float x, float y, float r)
        : name(n), position(x, y), velocity(0.0f, 0.0f), radius(r), isActive(true) {}

    void update(float deltaTime) {
        if (!isActive) return;
        position = position + (velocity * deltaTime);
    }

    bool checkCollision(const GameEntity& other) const {
        if (!isActive || !other.isActive) return false;
        Vec2 diff = position - other.position;
        return diff.length() <= (radius + other.radius);
    }
};

// Main Simulation Loop Demo
int main() {
    std::cout << "========================================" << std::endl;
    std::cout << "🧙‍♂️ Wiz C++ Game Simulation Engine Core" << std::endl;
    std::cout << "========================================" << std::endl;

    GameEntity ball("Ball", 300.0f, 200.0f, 8.0f);
    ball.velocity = Vec2(120.0f, -160.0f);

    GameEntity paddle("Paddle", 300.0f, 380.0f, 20.0f);

    std::cout << "[Engine] Starting 60FPS simulation sample (10 frames):" << std::endl;
    float dt = 1.0f / 60.0f;

    for (int frame = 1; frame <= 10; ++frame) {
        ball.update(dt);
        std::cout << "Frame #" << frame << " -> " << ball.name 
                  << " Pos: (" << ball.position.x << ", " << ball.position.y << ")" << std::endl;

        if (ball.checkCollision(paddle)) {
            std::cout << ">>> Collision detected between " << ball.name << " and " << paddle.name << "!" << std::endl;
        }
    }

    std::cout << "[Engine] Simulation completed successfully." << std::endl;
    return 0;
}
