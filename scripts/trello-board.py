#!/usr/bin/env python3
"""Sincroniza el tablero de Trello con las tareas del proyecto.

Es idempotente: busca el tablero por nombre, crea solo lo que falta y actualiza
descripciones y etiquetas de las tarjetas que ya existen. Nunca borra nada, y no
mueve una tarjeta de lista si la moviste a mano.

Credenciales: `~/.config/trello/creds` con dos líneas (KEY= / TOKEN=), o la ruta
que indique TRELLO_CREDS. Nunca se imprimen.
"""

import json
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://api.trello.com/1"
BOARD_NAME = os.environ.get("TRELLO_BOARD", "Rutigym 0.1")
CREDS = pathlib.Path(
    os.environ.get("TRELLO_CREDS", str(pathlib.Path.home() / ".config" / "trello" / "creds"))
)

LIST_ORDER = ["Pendiente / descartado", "En curso", "Hecho"]

LABELS = {
    "feature": ("Feature", "blue"),
    "release": ("Release", "green"),
    "docs": ("Docs", "yellow"),
    "fix": ("Fix", "red"),
}

CARDS: dict[str, list[tuple[str, str, list[str]]]] = {
    "Hecho": [
        (
            "Diagrama muscular con regiones nombradas",
            "SVG de frente y dorso con 58 regiones etiquetadas; el componente elige la "
            "vista por el músculo principal y encuadra el óvalo sobre lo trabajado.\n\n"
            "ab56df3, d6e9342",
            ["feature"],
        ),
        (
            "Estadísticas por ejercicio en modal",
            "Volumen, 1 RM con Epley, récords solo si hay un registro previo, gráfico de "
            "barras por serie e historial. Se abre desde Progreso y desde el registro.\n\n"
            "202dfb8",
            ["feature"],
        ),
        (
            "Progreso fusionado con selector de semana",
            "La tira semanal pasa a selector y el detalle vive debajo; la lista de sesiones "
            "y su ruta desaparecen. Un calendario propio permite elegir otra semana, con los "
            "días anteriores al primer entrenamiento deshabilitados.\n\nada8511",
            ["feature"],
        ),
        (
            "Los registros de la semana sobreviven al terminar el día",
            "Terminar día guarda la sesión sin borrar las series; se cierran al cambiar de "
            "semana, registrando antes los días pendientes.\n\nbaa07ab",
            ["feature"],
        ),
        (
            "Versión 0.1.0",
            "package.json y package-lock.json en 0.1.0; Android con versionCode 2 y "
            "versionName 0.1.0. Deja atrás la etapa MVP.\n\n74fa133",
            ["release"],
        ),
        (
            "Miniaturas en Añadir ejercicios",
            "Miniatura de 64 × 64 px entre el check y el nombre, con loading=lazy y "
            "alt vacío. Elegida tras comparar 128/96/64 px a escala real.\n\n76f6a81",
            ["feature"],
        ),
        (
            "Series precargadas desde la última sesión",
            "Cada serie arranca con el valor de esa misma serie en la última sesión real "
            "(las de demo no siembran). Cambiar kg o reps copia el valor a las series "
            "siguientes pendientes; las ya completadas se respetan.\n\nf6e68c0",
            ["feature"],
        ),
        (
            "Documentación del proyecto",
            "README al día y notas en odd/tasks: convenciones Angular, persistencia, "
            "rediseño UI v2 y pantallas iniciales.\n\n7a39712",
            ["docs"],
        ),
        ("Iconos de marca y foto hero", "07e96cb", ["feature"]),
        (
            "Scripts de build e instalación del APK",
            "android:apk y android:install en package.json.\n\n4a0e3d8",
            ["feature"],
        ),
        (
            "Export/import del plan como backup",
            "Exportación portable en JSON de plan, registro, últimos valores y sesiones.\n\n"
            "ee50559",
            ["feature"],
        ),
        (
            "Persistencia en SQLite",
            "Sustituye localStorage por @capacitor-community/sqlite con esquema relacional, "
            "escrituras serializadas y arranque en web y Android.\n\n"
            "c3de1c8, 067d3ea, 4091cb7, cfeb3ae",
            ["feature"],
        ),
        (
            "21 renders de máquinas y script de preparación",
            "WebP de 720 px sobre blanco con recorte y limpieza automática. Los 35 "
            "ejercicios del catálogo tienen imagen.\n\n38fe1eb, 54c4d91, 30edefc, 261e420, "
            "cffc207, 9918d05",
            ["feature"],
        ),
        (
            "Rediseño UI v2",
            "Sistema visual azul con tokens, tipografía Plus Jakarta, tarjetas y filas de "
            "serie responsive.\n\nace038f, 87cc91a, 80e5459, 12526df",
            ["feature"],
        ),
        (
            "Histórico de sesiones y semana de ejemplo",
            "Una sesión con fecha por día terminado, tira semanal con iniciales y semana de "
            "ejemplo borrable.\n\nb161b99, c65be07",
            ["feature"],
        ),
        (
            "Catálogo de 87 ejercicios en 6 grupos",
            "PECHO y HOMBRO salen de CORE y BRAZOS, y se suman 53 ejercicios con su "
            "imagen y sus músculos.\n\n4f0377c, 569d3c0, 311e4d3, 6c00c8a, 30ebed9, fc052a6",
            ["feature"],
        ),
        (
            "Pantallas completas del MVP",
            "Inicio, configuración, días, rutinas por día, añadir ejercicios, entrenar, "
            "registro de series y progreso.\n\nca38238, d6ccb20, a1a3e57, 3d89ca5",
            ["feature"],
        ),
    ],
    "En curso": [
        (
            "Instalar el APK con Progreso y el catálogo nuevo",
            "La APK instalada tiene el catálogo ampliado; falta compilar e instalar la que "
            "incluye Progreso con estadísticas y el selector de semana.",
            ["release"],
        ),
    ],
    "Pendiente / descartado": [
        (
            "Ejercicios sin foto propia",
            "Varios comparten floor-mat, multi-gym o dumbbell-rack. Candidato para un render "
            "3D solo si cambia el criterio de calidad.",
            ["feature"],
        ),
        (
            "Diagrama muscular vectorial",
            "Idea abierta: vista frontal y dorsal con regiones para destacar el músculo de "
            "cada ejercicio.",
            ["feature"],
        ),
        (
            "Imágenes generadas por IA o 3D",
            "Explorado y descartado con evidencia: SDXL alucina la pose y no localiza el "
            "músculo; Meshy da geometría correcta sin materiales ni UVs; TRELLIS trae "
            "textura pero deforma las proporciones. Ninguna supera la foto real a 330 px.",
            ["docs"],
        ),
    ],
}


def load_creds() -> tuple[str, str]:
    if not CREDS.exists():
        sys.exit(f"no existe {CREDS}")
    values: dict[str, str] = {}
    for line in CREDS.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            sys.exit("formato inválido: cada línea debe ser ETIQUETA=valor")
        label, _, value = line.partition("=")
        values[label.strip().upper()] = value.strip()

    key = values.get("KEY", "")
    token = values.get("TOKEN", "")
    if not key or not token:
        sys.exit("faltan KEY o TOKEN en el archivo")
    if len(key) != 32 or any(char not in "0123456789abcdefABCDEF" for char in key):
        sys.exit("KEY no tiene el formato de una API key de Trello (32 hex)")
    if len(token) < 20 or any(char.isspace() for char in token):
        sys.exit("TOKEN no tiene el formato esperado")

    return key, token


KEY, TOKEN = load_creds()


def call(method: str, path: str, **params):
    params["key"] = KEY
    params["token"] = TOKEN
    url = f"{BASE}{path}?{urllib.parse.urlencode(params)}"
    request = urllib.request.Request(url, method=method, data=b"" if method != "GET" else None)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as error:
        detail = ""
        try:
            payload = json.loads(error.read().decode())
            detail = payload.get("message") or payload.get("error") or ""
        except Exception:
            pass
        sys.exit(f"Trello respondió {error.code}: {detail or error.reason}")


def find_board() -> dict | None:
    boards = call("GET", "/members/me/boards", fields="name,shortUrl,closed")
    for board in boards:
        if board["name"] == BOARD_NAME and not board["closed"]:
            return board
    return None


def sync_lists(board_id: str) -> dict[str, str]:
    existing = {item["name"]: item for item in call("GET", f"/boards/{board_id}/lists")}
    list_ids: dict[str, str] = {}
    created = moved = 0

    for position, name in enumerate(LIST_ORDER, start=1):
        current = existing.get(name)
        if current is None:
            item = call("POST", "/lists", name=name, idBoard=board_id, pos=position * 1024)
            created += 1
        else:
            item = current
            if abs(current["pos"] - position * 1024) > 1:
                item = call("PUT", f"/lists/{current['id']}", pos=position * 1024)
                moved += 1
        list_ids[name] = item["id"]

    print(f"listas: {created} creadas, {moved} reordenadas, {len(existing)} ya existían")
    return list_ids


def sync_labels(board_id: str) -> dict[str, str]:
    existing = {label["name"]: label["id"] for label in call("GET", f"/boards/{board_id}/labels")}
    label_ids: dict[str, str] = {}
    created = 0

    for slug, (name, color) in LABELS.items():
        if name in existing:
            label_ids[slug] = existing[name]
        else:
            label = call("POST", f"/boards/{board_id}/labels", name=name, color=color)
            label_ids[slug] = label["id"]
            created += 1

    print(f"etiquetas: {created} creadas, {len(LABELS) - created} ya existían")
    return label_ids


RENAMES = {
    "Catálogo de 35 ejercicios en 4 grupos": "Catálogo de 87 ejercicios en 6 grupos",
    "Instalar el APK 0.1.0 en el teléfono": "APK instalada en el teléfono",
}
MOVES = {
    "APK instalada en el teléfono": "Hecho",
}


def normalize(list_ids: dict[str, str]) -> None:
    cards: dict[str, dict] = {}
    for name in LIST_ORDER:
        for card in call("GET", f"/lists/{list_ids[name]}/cards", fields="name,idList"):
            cards[card["name"]] = card

    for old, new in RENAMES.items():
        card = cards.get(old)
        if card:
            call("PUT", f"/cards/{card['id']}", name=new)
            cards[new] = cards.pop(old)
            print(f"renombrada: {old} → {new}")

    for name, target in MOVES.items():
        card = cards.get(name)
        if card and card["idList"] != list_ids[target]:
            call("PUT", f"/cards/{card['id']}", idList=list_ids[target])
            print(f"movida: {name} → {target}")


def sync_cards(list_ids: dict[str, str], label_ids: dict[str, str]) -> None:
    normalize(list_ids)
    existing: dict[str, dict] = {}
    for name in LIST_ORDER:
        for card in call("GET", f"/lists/{list_ids[name]}/cards", fields="name,desc,idLabels"):
            existing[card["name"]] = {**card, "list": name}

    created = updated = 0
    for list_name, cards in CARDS.items():
        for name, desc, slugs in cards:
            labels = ",".join(label_ids[slug] for slug in slugs)
            current = existing.get(name)
            if current is None:
                call(
                    "POST",
                    "/cards",
                    idList=list_ids[list_name],
                    name=name,
                    desc=desc,
                    pos="bottom",
                    idLabels=labels,
                )
                created += 1
                continue

            if current["desc"] == desc and sorted(current["idLabels"]) == sorted(labels.split(",")):
                continue

            # Actualiza el contenido pero respeta la lista: mover tarjetas es decisión humana.
            call("PUT", f"/cards/{current['id']}", desc=desc, idLabels=labels)
            updated += 1

    print(f"tarjetas: {created} creadas, {updated} actualizadas, {len(existing)} ya existían")


def main() -> None:
    me = call("GET", "/members/me", fields="username")
    board = find_board()

    if board is None:
        board = call(
            "POST",
            "/boards/",
            name=BOARD_NAME,
            desc="Tareas realizadas hasta la versión 0.1.0 de Rutigym "
            "(Angular 20 + Capacitor 8).",
            defaultLists="false",
            prefs_permissionLevel="private",
        )
        print(f"tablero creado: {board['shortUrl']}")
    else:
        print(f"tablero existente: {board['shortUrl']}")

    board_id = board["id"]
    list_ids = sync_lists(board_id)
    label_ids = sync_labels(board_id)
    sync_cards(list_ids, label_ids)
    print(f"listo en la cuenta {me.get('username')}: {board['shortUrl']}")


if __name__ == "__main__":
    main()
