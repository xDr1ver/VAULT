# VAULT: The Haptic Heist 🔐

> Telegram Mini App (TMA) — Тактильный PvP-взлом сейфа на слух и вибрацию.

## 🛠 Стек технологий
- **Frontend**: HTML5, Vanilla CSS3 (Design Tokens: Obsidian Vault, Apple HIG & Material 3), Canvas 2D API (High-DPI Retina).
- **Мультисенсорный отклик**: Procedural Web Audio API (zero audio files) + Telegram WebApp `HapticFeedback`.
- **Интеграция**: Telegram WebApp SDK (`expand`, `disableVerticalSwipes`, `themeParams`).
- **Dev-сервер**: Python 3 HTTP Server с CORS и Cache-Control.

## 🚀 Быстрый запуск локально
```bash
python3 server.py
```
Приложение откроется на `http://localhost:8080`.

## 📁 Структура проекта
```
VAULT/
├── index.html       # Главный экран с безопасными зонами (Safe-Area)
├── server.py        # Локальный HTTP-сервер
├── css/
│   └── style.css    # Дизайн-система "Obsidian Vault"
└── js/
    ├── audio.js     # Процедурный синтез звука (Web Audio API)
    ├── haptic.js    # Telegram Haptic Feedback bridge с троттлингом
    ├── dial.js      # Контроллер диска сейфа (Canvas, Pointer Events, инерция)
    └── game.js      # Игровой цикл (3 сувальды, таймер, Push-Your-Luck Cashout)
```
