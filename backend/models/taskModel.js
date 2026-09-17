import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref:"User"
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  dueDate: Date,
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium"
  },
  completed: {
    type: Boolean,
    default: false
  }
 },
  { timestamps: true}
);

const Task = mongoose.model("Task", taskSchema);
export default Task;