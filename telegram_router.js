/**
 * Zabbix Webhook media type: Telegram topic notification
 * ------------------------------------------------------
 * Отправляет алерт Zabbix в Telegram-супергруппу с включёнными топиками
 * (Forum), маршрутизируя сообщение по topic id (message_thread_id).
 *
 * Идея маршрутизации: id топика хранится как тег "thread_id" на хосте
 * или триггере (Zabbix tags), а не хардкодится в коде. Скрипт читает
 * этот тег через макрос {EVENT.TAGS.thread_id}; если тег не задан (макрос
 * не раскрылся и пришёл как есть, с фигурной скобкой) — сообщение уходит
 * в дефолтный топик. Так добавление нового хоста в нужный топик — это
 * просто тег на хосте, без правки скрипта или медиатипа.
 *
 * Это обезличенная портфолио-версия: реальные Token / To (chat_id) —
 * параметры конкретного медиатипа в Zabbix, здесь не хранятся и в код
 * не зашиты.
 *
 * Параметры медиатипа (Media type -> Parameters):
 *   Message            {ALERT.MESSAGE}
 *   Subject             {ALERT.SUBJECT}
 *   To                  chat_id целевой супергруппы (например -100XXXXXXXXXX)
 *   Token               токен бота из @BotFather
 *   message_thread_id   {EVENT.TAGS.thread_id}
 */

var DEFAULT_TOPIC_ID = '1'; // id топика по умолчанию — заменить на свой

try {
    var params = JSON.parse(value),
        req = new HttpRequest(),
        data;

    req.addHeader('Content-Type: application/json');

    data = {
        chat_id: params.To,
        text: '<b>' + params.Subject + '</b>\n\n' + params.Message,
        parse_mode: 'HTML'
    };

    // Логика выбора топика:
    // 1. Если тег thread_id есть на хосте/триггере и макрос реально
    //    раскрылся (не пустая строка и не осталась "{...}") — используем его.
    // 2. Иначе — дефолтный топик.
    if (
        params.message_thread_id &&
        params.message_thread_id.indexOf('{') === -1 &&
        params.message_thread_id !== ''
    ) {
        data.message_thread_id = params.message_thread_id;
    } else {
        data.message_thread_id = DEFAULT_TOPIC_ID;
    }

    var response = req.post(
        'https://api.telegram.org/bot' + params.Token + '/sendMessage',
        JSON.stringify(data)
    );

    if (req.getStatus() !== 200) {
        throw 'Error: ' + req.getStatus() + '. Response: ' + response;
    }

    return 'OK';
} catch (error) {
    Zabbix.log(3, 'Telegram Webhook failed: ' + error);
    throw 'Failed: ' + error;
}
