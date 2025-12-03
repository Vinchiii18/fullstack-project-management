import express from "express";
import {
  addComment,
  getTaskComments,
} from "../controllers/commentController.js";

const commentRouter = express.Router();

commentRouter.post("/", addComment);
commentRouter.post("/:taskId", getTaskComments);

export default commentRouter;
