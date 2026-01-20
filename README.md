# Discord Scheduler Bot

Prosty bot Discord z panelem WWW do planowania wiadomości (tekst + zdjęcia).

## Wymagania
*   Serwer VPS (np. VH.pl, Mikr.us) z systemem Linux (Debian/Ubuntu).
*   Zainstalowane: `Node.js` (wersja 18+), `npm`, `git`.

## Instrukcja Instalacji na VPS

### 1. Pobieranie projektu
Zaloguj się na serwer przez SSH i sklonuj repozytorium:
```bash
git clone https://github.com/TWOJ_NICK/discord-scheduler-bot.git
cd discord-scheduler-bot
```

### 2. Instalacja zależności
```bash
npm install
```

### 3. Konfiguracja
Stwórz plik `.env` i wklej swoje dane (pobierz je z komputera, nie udostępniaj ich na GitHubie!):
```bash
nano .env
```
Wklej (uzupełnij własnym tokenem):
```env
DISCORD_TOKEN=twoj_token
CLIENT_ID=twoj_client_id
GUILD_ID=twoj_server_id
```
Zapisz: `Ctrl+O`, `Enter`, wyjdź: `Ctrl+X`.

### 4. Uruchomienie (w tle)
Najlepiej użyć `pm2`, żeby bot działał 24/7 (nawet jak wyłączysz terminal).

Zainstaluj pm2:
```bash
npm install -g pm2
```

Uruchom bota:
```bash
pm2 start index.js --name "discord-scheduler"
```

Zapisz, żeby wstawał po restarcie serwera:
```bash
pm2 save
pm2 startup
```

Panel powinien działać pod adresem: `http://TWOJE_IP_SERWERA:3000`.

## Aktualizacja
Jak wprowadzisz zmiany w kodzie na komputerze, wyślij je na GitHuba, a potem na serwerze wpisz:

```bash
git pull
npm install
pm2 restart discord-scheduler
```
