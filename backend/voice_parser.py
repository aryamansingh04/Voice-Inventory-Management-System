import re


def parse_command(text):
    if not text:
        return "UNKNOWN"

    if "show" in text and "product" in text:
        return "SHOW_PRODUCTS"

    elif "low stock" in text:
        return "LOW_STOCK"

    elif "update" in text or "change" in text or "set" in text:
        return "UPDATE_STOCK"

    return "UNKNOWN"


def extract_update_details(text):
    if not text:
        return None, None

    match = re.search(r"(?:update|change|set)\s+(.+?)\s+(?:stock\s+)?to\s+(\d+)", text, re.IGNORECASE)
    if not match:
        return None, None

    product = match.group(1).strip()
    quantity = int(match.group(2))
    return product, quantity