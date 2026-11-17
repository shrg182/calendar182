CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO meta VALUES ('epoch', lower(hex(randomblob(16))));
CREATE TABLE changes (
 revision INTEGER PRIMARY KEY AUTOINCREMENT,
 account TEXT NOT NULL, id TEXT NOT NULL, date TEXT NOT NULL,
 text TEXT NOT NULL, deleted INTEGER NOT NULL CHECK (deleted IN (0,1)),
 UNIQUE(account,id)
);
CREATE INDEX changes_account_revision ON changes(account,revision);
CREATE INDEX changes_account_date_revision ON changes(account,date,revision);
CREATE TRIGGER immutable_operation BEFORE INSERT ON changes
WHEN EXISTS (SELECT 1 FROM changes WHERE account=NEW.account AND id=NEW.id
 AND (date<>NEW.date OR text<>NEW.text OR deleted<>NEW.deleted))
BEGIN
 SELECT RAISE(ABORT, 'operation_identity_conflict');
END;
