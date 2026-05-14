const mongoose = require('mongoose');

const pepTalkSubmissionSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    school:    { type: String, required: true, trim: true },
    videoLink: { type: String, required: true, trim: true },
    phone:     { type: String, required: true, trim: true },
    email:     { type: String, required: true, trim: true, lowercase: true },
    address:   { type: String, required: true, trim: true },
    permission: { type: Boolean, required: true },
    submittedAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: false });

pepTalkSubmissionSchema.index({ submittedAt: -1 });

module.exports = mongoose.model('PepTalkSubmission', pepTalkSubmissionSchema);
