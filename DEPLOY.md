# Деплой «Тренажёра слов» на VPS

Схема: приложение крутится в Docker и слушает только `127.0.0.1:3001`.
Наружу (порты 80/443) смотрит **nginx** на самом VPS — он проксирует запросы
в контейнер и терминирует HTTPS. Сертификат — бесплатный от **Let's Encrypt**
(через `certbot`). Домен — бесплатный поддомен от **DuckDNS**.

```
Интернет ──443/HTTPS──> nginx (VPS) ──proxy──> 127.0.0.1:3001 (Docker: Node+SQLite)
```

Дальше — по шагам. Где встречается `word-training.duckdns.org` или `VPS_IP` —
подставляй своё.

> **На этом VPS уже крутится несколько других приложений** через тот же nginx
> (свои поддомены, свои сертификаты). Это нормально — мы лишь **добавляем**
> ещё один сайт, ничего существующего не трогая (см. Шаг 5).

---

## Уже развёрнуто без домена — что поменялось

Контейнер `word-training-app-1` уже может быть поднят на VPS с портом
`"3001:3001"` (слушает на всех интерфейсах, доступен напрямую по
`http://VPS_IP:3001`, без HTTPS). Начиная с этой версии `docker-compose.yml`
порт публикуется только на `127.0.0.1` — снаружи приложение видно исключительно
через nginx. Чтобы применить: `git pull` + `docker compose up -d --build`
(шаг 4) — старый контейнер пересоздастся с новым пробросом порта.

---

## Шаг 1. Поддомен через DuckDNS

1. Зайди на <https://www.duckdns.org> → войди (тем же аккаунтом, что и для
   других поддоменов на этом VPS, если есть).
2. В поле добавления домена впиши имя, например `word-training` →
   получится `word-training.duckdns.org`.
3. Укажи **current ip** — публичный IP твоего VPS (`VPS_IP`), нажми **update ip**.
4. Проверь, что запись разошлась:
   ```bash
   dig +short word-training.duckdns.org
   # должен вернуть VPS_IP
   ```
   Если пусто — подожди 5–15 минут (DNS).

> IP у VPS обычно статический, поэтому cron-скрипт для авто-обновления IP
> (как для динамического домашнего IP) не нужен — досточно один раз выставить
> текущий IP в панели DuckDNS.

---

## Шаг 2. Подготовка VPS (один раз, если ещё не делалось)

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo apt install -y nginx certbot python3-certbot-nginx git
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # открывает 80 и 443
sudo ufw --force enable
```

На этом VPS Docker/nginx/certbot, скорее всего, уже стоят (для других
приложений) — команды идемпотентны, повторный запуск ничего не сломает.

---

## Шаг 3. Код на VPS

Если репозиторий ещё не клонирован:
```bash
cd /opt
sudo git clone https://github.com/zengo-ess/word-training.git
cd word-training
```
Если уже есть (контейнер `word-training-app-1` был поднят раньше):
```bash
cd /opt/word-training   # или где лежит
sudo git pull
```

---

## Шаг 4. Секреты и запуск в Docker

Файла `.env` в репозитории нет (он вне git). На сервере:
```bash
cp .env.example .env
nano .env
```
Вписать реальные значения `APP_PASSWORD`, `JWT_SECRET` (генерировать так:
`openssl rand -base64 48`), и опционально `UNSPLASH_ACCESS_KEY` /
`GOOGLE_TTS_API_KEY` для картинок и озвучки новых слов.

Если это первый деплой или уже был запуск со старым `docker-compose.yml`
(портом `0.0.0.0:3001`) — пересобрать и пересоздать контейнер:
```bash
sudo docker compose up -d --build
```

Проверить, что контейнер поднялся и отвечает только локально:
```bash
sudo docker compose ps
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/    # ждём 200
curl -s -o /dev/null -w '%{http_code}\n' http://VPS_IP:3001/ --max-time 3 || echo "снаружи недоступен — это правильно"
```

Полезное:
- логи: `sudo docker compose logs -f`
- перезапуск: `sudo docker compose restart`
- остановить: `sudo docker compose down` (база и аплоады сохраняются в volume)

---

## Шаг 5. Добавить сайт в nginx

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/word-training
sudo nano /etc/nginx/sites-available/word-training   # заменить word-training.duckdns.org, если имя другое

sudo ln -s /etc/nginx/sites-available/word-training /etc/nginx/sites-enabled/word-training

sudo nginx -t && sudo systemctl reload nginx
```

`nginx -t` проверит, что новый блок не ломает конфиги других сайтов на этом
VPS. Теперь `http://word-training.duckdns.org` уже открывается (пока без
HTTPS), остальные сайты продолжают работать как работали.

---

## Шаг 6. Включить HTTPS (Let's Encrypt)

```bash
sudo certbot --nginx -d word-training.duckdns.org
```

Certbot сам:
- выпустит сертификат,
- допишет в конфиг nginx блок `listen 443` с путями к сертификатам,
- настроит редирект с http на https (выбери этот вариант, когда спросит).

Проверка автопродления (сертификат живёт 90 дней, обновляется автоматически):
```bash
sudo certbot renew --dry-run
```

Готово — открывай `https://word-training.duckdns.org`.

---

## Обновление приложения (после новых коммитов)

```bash
cd /opt/word-training
sudo git pull
sudo docker compose up -d --build
```

База и загруженные файлы (volumes `db`, `uploads`) при этом не трогаются,
сертификат — тоже.

---

## Шпаргалка по диагностике

| Симптом | Что смотреть |
|---|---|
| Сайт не открывается по домену | `dig +short word-training.duckdns.org` == `VPS_IP`? Открыты ли 80/443 в `ufw`? |
| 502 Bad Gateway | Контейнер жив? `sudo docker compose ps`, `curl 127.0.0.1:3001` |
| certbot не выпускает сертификат | DNS уже указывает на VPS? Порт 80 открыт и nginx работает? |
| Приложение всё ещё видно на `VPS_IP:3001` напрямую | В `docker-compose.yml` порт должен быть `"127.0.0.1:3001:3001"` — пересоздать контейнер (`docker compose up -d --build`) |
