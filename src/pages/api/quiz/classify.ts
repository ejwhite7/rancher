import type { APIRoute } from "astro";
import { handleQuizClassification } from "../../../server/quiz-classifier";
export const prerender = false;
export const ALL: APIRoute = ({ request }) => handleQuizClassification(request);
