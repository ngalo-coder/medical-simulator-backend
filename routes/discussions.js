const express = require('express');
const router = express.Router();
const discussionController = require('../controllers/discussionController');
const { authenticateToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

router.get('/', authenticateToken, discussionController.getDiscussions);
router.post('/', authenticateToken, validate('discussionPost'), discussionController.createDiscussion);
router.get('/:id', authenticateToken, discussionController.getDiscussionById);
router.post('/:id/reply', authenticateToken, validate('discussionReply'), discussionController.replyToDiscussion);
router.post('/:id/vote', authenticateToken, discussionController.voteOnDiscussion);
router.put('/:id', authenticateToken, discussionController.updateDiscussion);
router.delete('/:id', authenticateToken, discussionController.deleteDiscussion);

module.exports = router;