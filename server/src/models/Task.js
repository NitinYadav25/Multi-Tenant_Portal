import mongoose from 'mongoose';

export const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE'
};

export const TASK_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
};

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: [TASK_STATUS.TODO, TASK_STATUS.IN_PROGRESS, TASK_STATUS.DONE],
        message: '{VALUE} is not a valid task status'
      },
      default: TASK_STATUS.TODO,
      required: true
    },
    priority: {
      type: String,
      enum: {
        values: [TASK_PRIORITY.LOW, TASK_PRIORITY.MEDIUM, TASK_PRIORITY.HIGH],
        message: '{VALUE} is not a valid task priority'
      },
      default: TASK_PRIORITY.MEDIUM,
      required: true
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required']
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      immutable: true // Denormalized for direct tenant-scoped queries
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    },
    dueDate: {
      type: Date,
      default: null
    },
    label: {
      type: String,
      trim: true,
      maxlength: [50, 'Label cannot exceed 50 characters'],
      default: ''
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

// Indexes
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ organization: 1, assignee: 1 });
taskSchema.index({ organization: 1, createdAt: -1 });

export const Task = mongoose.model('Task', taskSchema);
