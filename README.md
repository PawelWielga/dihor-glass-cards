# Dihor Glass Cards

![Dihor Glass Cards](icon.png)

PL: `dihor-glass-cards` to paczka kart do Home Assistant w stylu glass. Dodaje kilka gotowych kart Lovelace, które możesz wrzucić na dashboard bez pisania własnego kodu.

EN: `dihor-glass-cards` is a glass-style Home Assistant card package. It adds ready-to-use Lovelace cards that you can place on a dashboard without writing custom code.

## Co zawiera / What's Included

### `dihor-clock-card`

PL: Prosty, konfigurowalny zegar cyfrowy.

EN: A simple configurable digital clock.

### `dihor-minecraft-card`

PL: Karta do podglądu statusu serwera Minecraft.

EN: A card for checking Minecraft server status.

### `dihor-person-card`

PL: Karta osoby z Home Assistant, oparta o encję `person`.

EN: A Home Assistant person card based on a `person` entity.

### `dihor-toggle-button-card`

PL: Duży przycisk do sterowania pojedynczą encją, na przykład światłem, przełącznikiem albo sceną.

EN: A large button for controlling a single entity, such as a light, switch, or scene.

## Instalacja przez HACS / HACS Installation

PL:
1. Otwórz HACS w Home Assistant.
2. Wejdź w `Integrations` lub `Frontend`, zależnie od widoku HACS.
3. Dodaj to repozytorium jako custom repository typu `Dashboard`.
4. Zainstaluj `dihor-glass-cards`.
5. Odśwież Home Assistant albo wyczyść cache przeglądarki, jeśli karta nie pojawi się od razu.

EN:
1. Open HACS in Home Assistant.
2. Go to `Integrations` or `Frontend`, depending on your HACS view.
3. Add this repository as a `Dashboard` custom repository.
4. Install `dihor-glass-cards`.
5. Refresh Home Assistant or clear the browser cache if the card does not appear immediately.

## Zasób Home Assistant / Home Assistant Resource

PL: HACS powinien dodać zasób automatycznie. Jeśli robisz to ręcznie, dodaj:

EN: HACS should add the resource automatically. If you add it manually, use:

```yaml
url: /hacsfiles/dihor-glass-cards/dihor-glass-cards.js
type: module
```

## Przykłady / Examples

### Minecraft

```yaml
type: custom:dihor-minecraft-card
entity_prefix: server_minecraft
```

### Toggle Button

```yaml
type: custom:dihor-toggle-button-card
entity: light.bedroom
icon: mdi:lightbulb-on-outline
show_label: false
tap_action:
  action: toggle
hold_action:
  action: more-info
```

### Person

```yaml
type: custom:dihor-person-card
entity: person.tomek
phone_entity: device_tracker.tomek_phone
phone_platform: android
phone_icon: android
battery_entity: sensor.tomek_phone_battery_level
battery_charging_entity: binary_sensor.tomek_phone_is_charging
show_entity_picture: true
show_name: true
show_state: true
show_phone: true
show_battery: true
show_badge: true
show_last_changed: false
tap_action:
  action: more-info
```

PL: `phone_entity` jest opcjonalne. Jeśli go nie podasz, karta spróbuje użyć atrybutu `source` z encji `person`. `phone_platform` może być `auto`, `android` albo `iphone`. `battery_entity` może wskazywać sensor baterii telefonu; bez niego karta spróbuje odczytać `battery_level` lub `battery` z encji osoby albo telefonu. `battery_charging_entity` może wskazywać encję ze stanem ładowania.

EN: `phone_entity` is optional. If you do not set it, the card tries to use the `source` attribute from the `person` entity. `phone_platform` can be `auto`, `android`, or `iphone`. `battery_entity` can point to a phone battery sensor; without it, the card tries to read `battery_level` or `battery` from the person or phone entity. `battery_charging_entity` can point to an entity with the charging state.

PL: `phone_icon` pozwala recznie wymusic ikone telefonu, na przyklad `android`, `iphone`, `mdi:cellphone` albo `mdi:tablet`. Gdy pole jest puste, karta probuje wykryc typ telefonu automatycznie.

EN: `phone_icon` lets you manually force the phone icon, for example `android`, `iphone`, `mdi:cellphone`, or `mdi:tablet`. When it is empty, the card tries to detect the phone type automatically.

## Dopasowanie do dashboardu / Dashboard Fit

PL: Karty dopasowują się do dostępnej przestrzeni w układzie Home Assistant. Nie trzeba ustawiać wspólnej opcji rozmiaru.

EN: Cards adapt to the available space in the Home Assistant layout. You do not need to set a shared sizing option.

## Tło dla efektu glass / Background for the Glass Effect

PL: Do glass componentów z tej paczki warto dodać [PawelWielga/dihor-ha-background](https://github.com/PawelWielga/dihor-ha-background), żeby ustawić własne tło dashboardu i dobrze zobaczyć efekt szkła.

EN: For the glass components in this package, it works well to add [PawelWielga/dihor-ha-background](https://github.com/PawelWielga/dihor-ha-background) so you can set a custom dashboard background and clearly see the glass effect.

## Dla deweloperów / For Developers

PL: Informacje techniczne, komendy, struktura projektu i proces release są w [TECHNICAL.md](TECHNICAL.md).

EN: Technical information, commands, project structure, and release flow are in [TECHNICAL.md](TECHNICAL.md).

## License

MIT
