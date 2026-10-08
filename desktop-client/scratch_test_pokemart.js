// scratch_test_pokemart.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
    const win = new BrowserWindow({
        show: false,
        width: 1280,
        height: 800,
        webPreferences: {
            partition: 'persist:delugerpg',
            preload: path.join(__dirname, 'game-preload.js'),
            contextIsolation: false
        }
    });

    try {
        await win.loadURL('https://www.delugerpg.com/pokemart');
        await new Promise(r => setTimeout(r, 2000));

        const info = await win.webContents.executeJavaScript(`
            (() => {
                const inputs = Array.from(document.querySelectorAll('input'));
                return {
                    url: window.location.href,
                    title: document.title,
                    inputs: inputs.map(inp => ({
                        id: inp.id,
                        name: inp.name,
                        type: inp.type,
                        disabled: inp.disabled,
                        readOnly: inp.readOnly,
                        value: inp.value,
                        tabIndex: inp.tabIndex,
                        computedPointerEvents: window.getComputedStyle(inp).pointerEvents,
                        computedUserSelect: window.getComputedStyle(inp).userSelect,
                        className: inp.className
                    }))
                };
            })()
        `);
        console.log('Pokemart inspection:', JSON.stringify(info, null, 2));
    } catch (err) {
        console.error('Inspection error:', err);
    } finally {
        win.destroy();
        app.quit();
    }
});

