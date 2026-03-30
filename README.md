# Finanse - mini menedżer (HTML/CSS/JS)

## Opis aplikacji
Aplikacja webowa do podstawowego zarządzania finansami osobistymi. Umożliwia dodawanie transakcji (przychód/wydatek) wraz z kwotą, datą, kategorią i opcjonalnym opisem. Po wyborze miesiąca aplikacja wyświetla:
- sumę przychodów
- sumę wydatków
- saldo (przychody - wydatki)
- liczbę transakcji
- tabelę transakcji dla wybranego miesiąca oraz możliwość usuwania wpisów

Wszystkie dane zapisywane są lokalnie w przeglądarce (`localStorage`), więc aplikacja działa bez backendu.

## Funkcjonalności
- Dodawanie transakcji: typ, kwota (PLN), data, kategoria, opis
- Wybór miesiąca (filtrowanie transakcji po `YYYY-MM`)
- Automatyczne wyliczanie sum i salda dla wybranego miesiąca
- Lista kategorii podpowiadana w polu wejściowym (datalist)
- Usuwanie transakcji
- Wyczyść wszystkie transakcje (lokalnie)

## Technologie
- HTML5
- CSS3 (bez frameworków)
- JavaScript (vanilla)
- `localStorage` (bez bazy danych i bez backendu)
- `Intl.NumberFormat` do formatowania kwot w PLN

## Wymagania techniczne
- Dowolna współczesna przeglądarka wspierająca:
  - `Intl.NumberFormat`
  - `localStorage`
  - `crypto.randomUUID` (lub fallback w kodzie)

## Struktura projektu
- `index.html` - UI aplikacji
- `styles.css` - stylowanie
- `app.js` - logika aplikacji (walidacja, obliczenia, renderowanie, `localStorage`)
- `README.md` - dokumentacja projektu

## Instalacja i uruchomienie

### Opcja A (najprostsza): uruchomienie z przeglądarki
1. Otwórz plik `index.html` w przeglądarce.
2. Aplikacja zapisze dane lokalnie w `localStorage`.

### Opcja B: uruchomienie przez lokalny serwer (zalecane)
Jeśli przeglądarka blokuje działanie przy uruchomieniu “z pliku”, użyj lokalnego serwera:
1. Przejdź do katalogu projektu.
2. W PowerShell uruchom:
   - `python -m http.server 8000`
3. Wejdź w:
   - `http://localhost:8000/index.html`

## Testowanie
Wymagane jest dodanie co najmniej 5 testów jednostkowych (do wykonania w kolejnym etapie).

Aktualny stan:
- Testy jednostkowe: `TBD` (nie dodane / do uzupełnienia)
- Wynik testów: `TBD` (np. “5/5 testów przechodzi” po uruchomieniu)

## Wkład AI (do uzupełnienia zgodnie z prawdą)
Na końcu dokumentacji wymagane jest opisanie, które kroki wykonaliście samodzielnie, a które z pomocą AI.

Szablon do uzupełnienia:
- Samodzielnie zrobiliśmy: (wypisz)
- Z pomocą AI zrobiliśmy: (wypisz)
- Korekty/weryfikacje wykonane przez nas: (wypisz)