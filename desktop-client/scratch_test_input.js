// scratch_test_input.js
const { app, session } = require('electron');

app.whenReady().then(async () => {
    const ses = session.fromPartition('persist:delugerpg');
    // Fetch pokemart page using authenticated session cookies
    const cookies = await ses.cookies.get({ domain: 'delugerpg.com' });
    console.log('Cookies count:', cookies.length);
    if (cookies.length > 0) {
        console.log('Cookie names:', cookies.map(c => c.name));
    }
    app.quit();
});

