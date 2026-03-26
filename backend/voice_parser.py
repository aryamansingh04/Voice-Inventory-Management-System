import speech_recognition as sr


def get_voice_command():
    recognizer = sr.Recognizer()

    with sr.Microphone() as source:
        print("🎤 Listening...")
        recognizer.adjust_for_ambient_noise(source, duration=1)
        audio = recognizer.listen(source)

    try:
        text = recognizer.recognize_google(audio)
        return text.lower()
    except:
        return None


def parse_command(text):
    if not text:
        return "UNKNOWN"

    if "show" in text and "product" in text:
        return "SHOW_PRODUCTS"

    elif "low stock" in text:
        return "LOW_STOCK"

    elif "update" in text or "change" in text:
        return "UPDATE_STOCK"

    return "UNKNOWN"


def extract_update_details(text):
    words = text.split()

    product = None
    quantity = None

    try:
        for word in words:
            if word.isdigit():
                quantity = int(word)

        if "update" in words:
            product = words[words.index("update") + 1]

        elif "change" in words:
            product = words[words.index("change") + 1]

    except:
        return None, None

    return product, quantity