import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export type AppFileInput = {
    buffer?: Buffer;
    originalname?: string;
    path?: string;
    filename?: string;
};

export type SaveAppFileParams = {
    file: AppFileInput;
    baseDir?: string;
    subDir?: string;
    fileName?: string;
};

export type SaveAppFileResult = {
    fileName: string;
    fileDir: string;
    filePath: string;
};

const DEFAULT_BASE_DIR = 'uploads';

const sanitizeSegment = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

const sanitizeSubDir = (subDir?: string) => {
    if (!subDir) return '';
    return subDir
        .split(/[\\/]+/)
        .map((segment) => sanitizeSegment(segment))
        .filter(Boolean)
        .join(path.sep);
};

const sanitizeFileName = (name: string) => sanitizeSegment(path.basename(name));

export async function saveAppFile(params: SaveAppFileParams): Promise<SaveAppFileResult> {
    const { file, baseDir = DEFAULT_BASE_DIR, subDir, fileName } = params;

    if (!file) {
        throw new Error('Archivo requerido para guardar.');
    }

    const originalName = file.originalname ?? file.filename ?? 'archivo';
    const ext = path.extname(originalName);
    const base = sanitizeSegment(path.basename(originalName, ext)) || 'archivo';

    const proposedName = fileName
        ? sanitizeFileName(fileName)
        : `${base}_${Date.now()}_${randomUUID().slice(0, 8)}${ext}`;

    const safeSubDir = sanitizeSubDir(subDir);
    const baseDirAbs = path.isAbsolute(baseDir) ? baseDir : path.resolve(process.cwd(), baseDir);
    const targetDir = safeSubDir ? path.join(baseDirAbs, safeSubDir) : baseDirAbs;

    await fs.mkdir(targetDir, { recursive: true });

    const targetPath = path.join(targetDir, proposedName);

    if (file.buffer) {
        await fs.writeFile(targetPath, file.buffer);
    } else if (file.path) {
        await fs.copyFile(file.path, targetPath);
    } else {
        throw new Error('El archivo no tiene contenido para guardar.');
    }

    const relativeDir = path.relative(process.cwd(), targetDir);
    const relativePath = path.join(relativeDir, proposedName);

    return {
        fileName: proposedName,
        fileDir: relativeDir,
        filePath: relativePath
    };
}
