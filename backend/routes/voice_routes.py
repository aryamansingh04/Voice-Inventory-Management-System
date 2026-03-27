from difflib import SequenceMatcher
from flask import Blueprint, jsonify, request
from voice_parser import parse_command, extract_update_details
from db import get_connection

voice_bp = Blueprint("voice", __name__)


def _close_db(cursor, conn):
    if cursor:
        cursor.close()
    if conn:
        conn.close()


def _best_product_match(spoken_name, products):
    spoken = spoken_name.strip().lower()
    normalized = [(p, str(p.get("P_Name", "")).strip().lower()) for p in products]

    for product, name in normalized:
        if spoken == name:
            return product

    for product, name in normalized:
        if spoken in name or name in spoken:
            return product

    best = None
    best_score = 0.0
    for product, name in normalized:
        score = SequenceMatcher(None, spoken, name).ratio()
        if score > best_score:
            best = product
            best_score = score

    if best and best_score >= 0.66:
        return best
    return None


def _execute_voice_command(text):
    action = parse_command(text)
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        if action == "SHOW_PRODUCTS":
            cursor.execute("SELECT * FROM Product ORDER BY P_Name ASC")
            return jsonify(cursor.fetchall()), 200

        if action == "LOW_STOCK":
            cursor.execute("SELECT * FROM Product WHERE is_low_stock = TRUE ORDER BY quantity ASC, P_Name ASC")
            return jsonify(cursor.fetchall()), 200

        if action == "UPDATE_STOCK":
            product_name, qty = extract_update_details(text)

            if not product_name or qty is None:
                return jsonify({"error": "Could not parse command. Try: Update Keyboard to 30"}), 400

            cursor.execute("SELECT P_ID, P_Name FROM Product")
            products = cursor.fetchall()
            if not products:
                return jsonify({"error": "No products found in inventory"}), 404

            matched = _best_product_match(product_name, products)
            if not matched:
                return jsonify({"error": f'No close product match for "{product_name}"'}), 404

            cursor.execute("UPDATE Product SET quantity = %s WHERE P_ID = %s", (qty, matched["P_ID"]))
            conn.commit()

            return jsonify({
                "message": f'{matched["P_Name"]} updated to {qty}',
                "product": matched["P_Name"],
                "quantity": qty,
                "action": "UPDATE_STOCK",
            }), 200

        return jsonify({"error": "Unknown command"}), 400
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": f"Voice command failed: {exc}"}), 500
    finally:
        _close_db(cursor, conn)


@voice_bp.route("/voice-command", methods=["POST"])
def voice_command():
    payload = request.get_json(silent=True) or {}
    text = (payload.get("text") or "").strip()

    if not text:
        return jsonify({"error": "Missing voice command text"}), 400

    return _execute_voice_command(text)