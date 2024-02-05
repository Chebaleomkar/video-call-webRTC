const express = require('express');
const router = express();

const userController = require('../controller/userController');

router.get('', userController.loadIndex);

module.exports = router;
