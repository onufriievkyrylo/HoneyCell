const express = require('express'),
    router = express.Router(),
    User = require(`${__base}/models/User`);

router.get('/teapot', (req, res) => {
    console.log("LET'S DRINK SOME TEA!!!");
    res.status(418).send();
})

module.exports = router;