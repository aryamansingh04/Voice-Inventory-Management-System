from flask import Blueprint, request, jsonify
from db import get_connection

product_bp = Blueprint("product", __name__)


def _close_db(cursor, conn):
    if cursor:
        cursor.close()
    if conn:
        conn.close()


@product_bp.route("/products", methods=["GET"])
def get_products():
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT
              p.P_ID,
              p.P_Name,
              p.P_Desc,
              p.quantity,
              p.is_low_stock,
              c.Cat_Name
            FROM Product p
            LEFT JOIN Category c ON c.Cat_ID = p.Cat_ID
            ORDER BY p.P_Name ASC
            """
        )
        data = cursor.fetchall()
        return jsonify(data), 200
    except Exception as exc:
        return jsonify({"error": f"Failed to fetch products: {exc}"}), 500
    finally:
        _close_db(cursor, conn)

@product_bp.route("/update", methods=["POST"])
def update_stock():
    data = request.get_json(silent=True) or {}
    p_id = data.get("P_ID")
    quantity = data.get("quantity")

    try:
        p_id = int(p_id)
        quantity = int(quantity)
    except (TypeError, ValueError):
        return jsonify({"error": "P_ID and quantity must be integers"}), 400

    if quantity < 0:
        return jsonify({"error": "Quantity cannot be negative"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT P_ID, P_Name FROM Product WHERE P_ID = %s", (p_id,))
        product = cursor.fetchone()
        if not product:
            return jsonify({"error": f"Product with id {p_id} not found"}), 404

        cursor.execute("UPDATE Product SET quantity = %s WHERE P_ID = %s", (quantity, p_id))
        conn.commit()
        return jsonify({"message": f'{product["P_Name"]} updated to {quantity}', "product": product["P_Name"], "quantity": quantity}), 200
    except Exception as exc:
        if conn:
            conn.rollback()
        return jsonify({"error": f"Failed to update stock: {exc}"}), 500
    finally:
        _close_db(cursor, conn)

@product_bp.route("/low-stock", methods=["GET"])
def low_stock():
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Product WHERE is_low_stock = TRUE ORDER BY quantity ASC, P_Name ASC")
        data = cursor.fetchall()
        return jsonify(data), 200
    except Exception as exc:
        return jsonify({"error": f"Failed to fetch low stock products: {exc}"}), 500
    finally:
        _close_db(cursor, conn)