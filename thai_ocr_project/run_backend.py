import os
import sys

APP_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(APP_DIR)

os.chdir(APP_DIR)
sys.path.insert(0, APP_DIR)
sys.path.insert(1, PROJECT_ROOT)

from app import app


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False, use_reloader=False)
