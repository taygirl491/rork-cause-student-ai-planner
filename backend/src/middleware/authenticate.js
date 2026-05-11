/**
 * Simple API key authentication middleware
 */
const authenticate = (req, res, next) => {
	const apiKey = req.headers["x-api-key"];
	if (!apiKey || apiKey !== process.env.API_SECRET) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	next();
};

module.exports = authenticate;
