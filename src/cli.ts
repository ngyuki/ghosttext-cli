import { promises as fs } from 'fs';
import * as http from 'http';
import WebSocket from 'ws';

(async function () {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error(`Usage: ghosttext-cli <file>`);
        process.exit(1);
    }

    const file = args[0];
    const text = await fs.readFile(file, { encoding: 'utf-8' });

    const webSocketPort = await requestGetWebSocketPort();

    await connectWebSocket(webSocketPort, { title: file, text: text }, async (data) => {
        await fs.writeFile(file, data.text, { encoding: 'utf-8' });
    });
})()


async function requestGetWebSocketPort(): Promise<number> {
    const url = 'http://localhost:4001';
    const body = await new Promise<string>(resolve => {
        const chunks: string[] = [];
        http.get(url, (response) => {
            response.on('data', (chunk) => {
                chunks.push(chunk.toString());
            });
            response.on('end', () => {
                resolve(chunks.join());
            });
        })
    });
    const { WebSocketPort: webSocketPort } = JSON.parse(body);
    return webSocketPort;
};

interface GhostTextData {
    title: string,
    text: string,
    selections?: {start: number, end: number}[]
    url?: string,
    syntax?: string,
}

async function connectWebSocket(webSocketPort: number, input: GhostTextData, cb: (data: GhostTextData) => unknown) {
    const url = `ws:localhost:${webSocketPort}`;

    return new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(url);

        socket.on('open', () => {
            socket.send(JSON.stringify(input), (err) => {
                if (err) {
                    reject(err);
                }
            });
        });

        socket.on('message', (data) => {
            cb(JSON.parse(data.toString()));
        });

        socket.on('close', (code: number, reason: string) => {
            resolve();
        });
    });
};
