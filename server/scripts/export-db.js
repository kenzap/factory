import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import dotenv from "dotenv";

dotenv.config();

function parseArgs(argv) {
    const args = {
        outFile: "docs/generated/dumps/postgres/data.sql",
        container: process.env.POSTGRES_CONTAINER || "postgres",
        db: process.env.POSTGRES_DB || "cloud",
        user: process.env.POSTGRES_USER || "postgres",
        inserts: false
    };

    for (const arg of argv) {
        if (arg.startsWith("--out=")) args.outFile = arg.slice("--out=".length);
        if (arg.startsWith("--container=")) args.container = arg.slice("--container=".length);
        if (arg.startsWith("--db=")) args.db = arg.slice("--db=".length);
        if (arg.startsWith("--user=")) args.user = arg.slice("--user=".length);
        if (arg === "--inserts") args.inserts = true;
    }

    return args;
}

function exportDb(args) {
    const outFileAbs = path.resolve(process.cwd(), args.outFile);
    fs.mkdirSync(path.dirname(outFileAbs), { recursive: true });

    const pgDumpArgs = [
        "exec",
        ...(process.env.POSTGRES_PASSWORD ? ["-e", `PGPASSWORD=${process.env.POSTGRES_PASSWORD}`] : []),
        args.container,
        "pg_dump",
        "-U",
        args.user,
        "-d",
        args.db,
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "--encoding=UTF8",
        "--quote-all-identifiers"
    ];

    if (args.inserts) {
        pgDumpArgs.push("--inserts");
    }

    const output = fs.createWriteStream(outFileAbs, { flags: "w" });
    const child = spawn("docker", pgDumpArgs, {
        stdio: ["ignore", "pipe", "inherit"]
    });

    child.stdout.pipe(output);

    child.on("error", (err) => {
        console.error(`[export-db] Failed to start docker: ${err.message}`);
        process.exit(1);
    });

    child.on("close", (code) => {
        output.end();
        if (code !== 0) {
            console.error(`[export-db] docker exec pg_dump exited with status ${code}`);
            process.exit(code || 1);
        }
        console.log(`[export-db] Export complete: ${outFileAbs}`);
    });
}

exportDb(parseArgs(process.argv.slice(2)));
