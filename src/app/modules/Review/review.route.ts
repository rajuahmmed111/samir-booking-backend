import express from "express";
import { ReviewController } from "./review.controller";
import auth from "../../middlewares/auth";

const router = express.Router();

// get all reviews
router.get("/", ReviewController.getAllReviews);

// get all hotel reviews by hotel id
router.get("/hotel/:hotelId", ReviewController.getAllHotelReviewsByHotelId);

// create hotel review
router.post("/hotel", auth(), ReviewController.createHotelReview);

export const reviewRoute = router;