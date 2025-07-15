import mongoose from "mongoose";


interface IFeedback extends mongoose.Document {
    userId: mongoose.Types.ObjectId;
    feedback: string;
    updatedAt: Date;
}


interface IFeedbackModel extends mongoose.Model<IFeedback> {
    submitFeedback(userId: mongoose.Types.ObjectId, feedback: string): Promise<IFeedback>;
    getFeedBacks(): Promise<IFeedback[]>;
}

const feedbackSchema: mongoose.Schema = new mongoose.Schema<IFeedback>({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    feedback: {
        type: String,
        required: true
    },

}, {
    timestamps: {
        updatedAt: true,createdAt: false,
    }
});

feedbackSchema.statics.submitFeedback = async function (userId: mongoose.Types.ObjectId, feedback: string): Promise<IFeedback> {
    const newFeedback = new this({
        userId,
        feedback
    });
    return await newFeedback.save();
};

feedbackSchema.statics.getFeedBacks = async function (): Promise<IFeedback[]> {
    return await this.find().sort({ updatedAt: -1 });
}

export const Feedback = mongoose.model<IFeedback, IFeedbackModel>('Feedback', feedbackSchema);