# Structural Source Code Plagiarism Checker

This project is a Source Code Plagiarism Checker that implements **Compiler Design** concepts to detect structural similarities in Python `.py` files. It easily catches attempts at obfuscation like variable renaming, comment injection, and whitespace modification.

## 🚀 How to Run

1. Open your terminal in this directory.
2. Run the main CLI tool against a target directory. For testing, we included a `test_data` folder!

```bash
python main.py test_data
```

### Optional Arguments:
- `--kgram`: Adjust the size of the k-grams (default: `5`)
- `--window`: Adjust the Winnowing algorithm window size (default: `4`)
- `--threshold`: The percentage threshold to flag as a [MATCH] (default: `70.0`)

Example:
```bash
python main.py test_data --kgram 6 --window 5 --threshold 80.0
```

---

## 🖥️ Web Interface (Optional)

The repository also includes a simple FastAPI frontend/backend that allows
you to upload `.py` files or a ZIP archive via a browser, view similarity
results, and generate PDF reports.  To use it you'll need the packages
listed in `requirements.txt` (FastAPI, uvicorn, ReportLab, etc.).

1. Create a virtual environment and install dependencies:

```bash
python -m venv .venv          # create env (Windows/Mac/Linux)
.venv\Scripts\activate      # or `source .venv/bin/activate`
pip install -r requirements.txt
```

2. Start the server (either `uvicorn backend.main:app --reload` or
   `python -m uvicorn backend.main:app --reload` if the script isn't on your
   PATH).

3. Open `http://127.0.0.1:8000/` in your browser.  The home page lets you
   upload files and run the structural plagiarism check.  The `/compare`
   page shows side‑by‑side comparisons when you click a result.  You can also
   call the API endpoints directly (`/api/upload`, `/api/compare`, `/api/matrix`).

4. To generate a PDF report, click the "Download Report" button on the
   comparison screen.


## 🛠️ Environment & Requirements

- Python **3.7 or newer** (tested on 3.13).
- No external dependencies are required for the CLI, but the web UI
  needs the packages in `requirements.txt`.
- Installing inside a virtual environment prevents polluting the global
  site‑packages and makes it easy to remove later.


## 🧩 Recommended VS Code Extensions

- **Python** (`ms-python.python`) – language support, interpreter selection,
  linting, and debugging.
- **Pylance** (`ms-python.vscode-pylance`) – performant IntelliSense with
  type checking.
- **Code Runner** (optional) – quickly run a file or selection.
- **FastAPI** / **REST Client** (optional) – help inspect API endpoints.

These extensions make development, debugging, and exploration much smoother.

---

---

## 📘 Compiler Design Principles Explained (For Presentation)

When explaining this project to your evaluators, highlight how the pipeline mimics the standard phases of a language compiler to achieve a true structural assessment instead of a naive textual analysis.

### 1. Lexical Analysis & Syntax Analysis (The Parser)
**File: `ast_parser.py`**
- **How a compiler does it:** The Lexer (scanner) converts streams of characters into tokens (removing whitespace and comments). Then, the Parser groups these tokens to form an Abstract Syntax Tree (AST), checking grammar.
- **How we did it:** We use Python’s built-in `ast` module to accomplish both Lexical and Syntax analysis simultaneously. By walking through the resulting Abstract Syntax Tree, we extract only the **structural node types** (e.g., `FunctionDef`, `For`, `If`) and ignore identifiers (`ans`, `num`), string literals, and formatting. This acts as a structural scanner, effectively neutralizing cheating techniques where students simply rename variables or move spaces around.

### 2. Intermediate Representation & Symbol Hashing (The K-Grams)
**File: `winnowing.py`**
- **How a compiler does it:** A compiler often translates ASTs into an Intermediate Representation (IR) and maintains a hashed Symbol Table for fast lookups.
- **How we did it:** We treat the list of structural tokens as our IR. To make comparisons scalable and fast, we divide this sequence into overlapping chunks called **K-Grams** (e.g., of size 5). By hashing these structural chunks (similar to indexing tokens in a compiler's symbol table lookup), we abstract our parsed states into predictable numerical outputs.

### 3. Optimization / State Compression (Winnowing)
**File: `winnowing.py`**
- **How a compiler does it:** Optimization phases compress instructions and eliminate redundant information without losing meaning. 
- **How we did it:** Instead of storing thousands of K-Gram hashes for large codebases, we apply the **Winnowing Algorithm**. This slides a window across our hashes and selects the minimum hash in each window to represent the file. It provides an efficient and compact document "fingerprint"—guaranteeing that global structural matches are detected while severely minimizing our memory footprint compared to comparing direct tree nodes!

### 4. Evaluation 
**File: `similarity.py`**
Finally, we calculate the overlapping intersection between fingerprints using **Jaccard Similarity** (Intersection over Union). If the matching internal node structures exceed a threshold threshold (like 70%), we flag the documents precisely!
