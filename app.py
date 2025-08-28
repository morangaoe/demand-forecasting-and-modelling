import os
import sqlite3
from datetime import datetime
from flask import Flask, g, render_template, request, redirect, url_for, jsonify, abort


DATABASE_PATH = "/workspace/ratings.db"


def create_app() -> Flask:
    app = Flask(__name__)

    # Ensure DB schema and seed at startup (Flask 3 removed before_first_request)
    def ensure_db_initialized() -> None:
        os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
        connection = sqlite3.connect(DATABASE_PATH)
        try:
            cursor = connection.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT
                );
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS ratings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    item_id INTEGER NOT NULL,
                    score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
                    comment TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
                );
                """
            )
            count = cursor.execute("SELECT COUNT(1) FROM items").fetchone()[0]
            if count == 0:
                cursor.executemany(
                    "INSERT INTO items (name, description) VALUES (?, ?)",
                    [
                        ("Coffee", "A nice hot cup of coffee"),
                        ("Tea", "Refreshing green tea"),
                        ("Pizza", "Cheesy delicious slice"),
                        ("Movie: Inception", "Mind-bending thriller by Christopher Nolan"),
                    ],
                )
            connection.commit()
        finally:
            connection.close()
    ensure_db_initialized()

    @app.before_request
    def _connect_db() -> None:
        if "db" not in g:
            connection = sqlite3.connect(DATABASE_PATH)
            connection.row_factory = sqlite3.Row
            g.db = connection

    @app.teardown_request
    def _close_db(exception) -> None:  # noqa: ARG001 - exception required by Flask signature
        db = g.pop("db", None)
        if db is not None:
            db.close()

    def init_db() -> None:
        cursor = g.db.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT
            );
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id INTEGER NOT NULL,
                score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
                comment TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
            );
            """
        )
        # Seed items if empty
        count = cursor.execute("SELECT COUNT(1) FROM items").fetchone()[0]
        if count == 0:
            cursor.executemany(
                "INSERT INTO items (name, description) VALUES (?, ?)",
                [
                    ("Coffee", "A nice hot cup of coffee"),
                    ("Tea", "Refreshing green tea"),
                    ("Pizza", "Cheesy delicious slice"),
                    ("Movie: Inception", "Mind-bending thriller by Christopher Nolan"),
                ],
            )
        g.db.commit()

    # init_db kept for compatibility; schema is created at startup by ensure_db_initialized

    def fetch_items_with_stats() -> list[sqlite3.Row]:
        query = (
            "SELECT i.id, i.name, i.description, "
            "COALESCE(ROUND(AVG(r.score), 1), 0) AS avg_rating, "
            "COUNT(r.id) AS rating_count "
            "FROM items i LEFT JOIN ratings r ON r.item_id = i.id "
            "GROUP BY i.id ORDER BY i.name"
        )
        return g.db.execute(query).fetchall()

    def fetch_item_with_stats(item_id: int) -> sqlite3.Row | None:
        query = (
            "SELECT i.id, i.name, i.description, "
            "COALESCE(ROUND(AVG(r.score), 1), 0) AS avg_rating, "
            "COUNT(r.id) AS rating_count "
            "FROM items i LEFT JOIN ratings r ON r.item_id = i.id "
            "WHERE i.id = ? GROUP BY i.id"
        )
        rows = g.db.execute(query, (item_id,)).fetchall()
        return rows[0] if rows else None

    def fetch_recent_comments(item_id: int, limit: int = 10) -> list[sqlite3.Row]:
        return g.db.execute(
            "SELECT score, comment, created_at FROM ratings WHERE item_id = ? ORDER BY id DESC LIMIT ?",
            (item_id, limit),
        ).fetchall()

    @app.get("/")
    def index():
        items = fetch_items_with_stats()
        return render_template("index.html", items=items)

    @app.get("/item/<int:item_id>")
    def item_detail(item_id: int):
        item = fetch_item_with_stats(item_id)
        if item is None:
            abort(404)
        comments = fetch_recent_comments(item_id)
        return render_template("item.html", item=item, comments=comments)

    def _insert_rating(item_id: int, score: int, comment: str | None) -> None:
        g.db.execute(
            "INSERT INTO ratings (item_id, score, comment, created_at) VALUES (?, ?, ?, ?)",
            (item_id, score, (comment or "").strip() or None, datetime.utcnow().isoformat()),
        )
        g.db.commit()

    def _item_exists(item_id: int) -> bool:
        row = g.db.execute("SELECT 1 FROM items WHERE id = ?", (item_id,)).fetchone()
        return row is not None

    def _stats_json(item_id: int) -> dict:
        row = g.db.execute(
            "SELECT COALESCE(ROUND(AVG(score), 1), 0) AS avg_rating, COUNT(id) AS rating_count FROM ratings WHERE item_id = ?",
            (item_id,),
        ).fetchone()
        return {"avg": float(row[0]), "count": int(row[1])}

    @app.post("/rate")
    def rate():
        if request.is_json:
            payload = request.get_json(silent=True) or {}
            try:
                item_id = int(payload.get("item_id"))
                score = int(payload.get("score"))
            except (TypeError, ValueError):
                return jsonify({"error": "Invalid item_id or score"}), 400
            comment = (payload.get("comment") or "").strip()
            if not (1 <= score <= 5):
                return jsonify({"error": "Score must be between 1 and 5"}), 400
            if not _item_exists(item_id):
                return jsonify({"error": "Item not found"}), 404
            _insert_rating(item_id, score, comment)
            stats = _stats_json(item_id)
            return jsonify({"ok": True, "stats": stats})

        # Fallback: handle form submission
        try:
            item_id = int(request.form.get("item_id", 0))
            score = int(request.form.get("score", 0))
        except ValueError:
            abort(400)
        if not (1 <= score <= 5):
            abort(400)
        if not _item_exists(item_id):
            abort(404)
        comment = request.form.get("comment", "")
        _insert_rating(item_id, score, comment)
        return redirect(url_for("item_detail", item_id=item_id))

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)

