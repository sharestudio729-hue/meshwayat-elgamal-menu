const { isAuthed } = require('./_auth.js');

module.exports = async (req, res) => {
  res.status(200).json({ authed: isAuthed(req) });
};
