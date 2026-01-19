import { Router } from "express";
import { RecordProofVideoController } from "./recordProofVideo.controller";
import { uploadFile } from "../../../helpars/fileUploader";
import { parseBodyData } from "../../middlewares/parseNestedJson";

const router = Router();

// create record proof video starting
router.post(
  "/:bookingId/starting-proof",
  uploadFile.upload.fields([
    { name: "recordProofVideoStarting", maxCount: 40 },
  ]),
  parseBodyData,
  RecordProofVideoController.createRecordProofVideoStarting,
);

// update record proof video ending
router.patch(
  "/:bookingId/ending-proof",
  uploadFile.upload.fields([{ name: "recordProofVideoEnding", maxCount: 40 }]),
  parseBodyData,
  RecordProofVideoController.updateRecordProofVideoEnding,
);

export const startingEndingProofVideoRoutes = router;
