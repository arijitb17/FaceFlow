#!/usr/bin/env python3
"""
Enhanced Face Recognition Script
Processes images from test-images/ folder and outputs recognition results
"""

import os
import cv2
import numpy as np
from insightface.app import FaceAnalysis
import pickle
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import json
import sys
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define Paths
TEST_FOLDER = "test-images"
OUTPUT_FOLDER = "output"
EMBEDDINGS_FILE = "face_embeddings.pkl"

def enhance_image_for_detection(image):
    """Enhance image for better face detection"""
    try:
        pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        # Apply enhancements
        enhanced = ImageEnhance.Brightness(pil_image).enhance(1.2)
        enhanced = ImageEnhance.Contrast(enhanced).enhance(1.5)
        enhanced = ImageEnhance.Sharpness(enhanced).enhance(1.3)
        
        # Convert back to opencv format
        return cv2.cvtColor(np.array(enhanced), cv2.COLOR_RGB2BGR)
    except Exception as e:
        logger.warning(f"Image enhancement failed: {e}")
        return image

def cosine_similarity(a, b):
    """Calculate cosine similarity between two vectors"""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def process_single_image(image_path, known_faces, app, image_index, confidence_threshold=0.45):
    """Process a single image and return detection results"""
    detections = []
    
    try:
        # Load image
        img = cv2.imread(image_path)
        if img is None or img.shape[0] == 0 or img.shape[1] == 0:
            logger.warning(f"Invalid image: {image_path}")
            return detections

        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        pil_original = Image.fromarray(img_rgb)

        # Try different image processing approaches
        processing_methods = [
            ("original", np.array(pil_original)),
            ("enhanced", enhance_image_for_detection(img)),
            ("histogram_equalized", cv2.equalizeHist(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))),
        ]

        all_faces = []
        
        # Try each processing method
        for method_name, processed_img in processing_methods:
            try:
                if len(processed_img.shape) == 2:  # Grayscale
                    processed_img = cv2.cvtColor(processed_img, cv2.COLOR_GRAY2RGB)
                elif len(processed_img.shape) == 3 and processed_img.shape[2] == 3:
                    # Already RGB, convert to RGB if needed
                    if method_name != "original":
                        processed_img = cv2.cvtColor(processed_img, cv2.COLOR_BGR2RGB)
                
                faces = app.get(processed_img)
                
                if faces:
                    logger.debug(f"Found {len(faces)} faces using {method_name} method")
                    all_faces.extend(faces)
                    
            except Exception as e:
                logger.debug(f"Error with {method_name} processing: {e}")
                continue

        # Remove duplicate faces (same location)
        unique_faces = []
        for face in all_faces:
            bbox = face.bbox
            is_duplicate = False
            
            for unique_face in unique_faces:
                unique_bbox = unique_face.bbox
                # Check if bboxes overlap significantly
                overlap_threshold = 0.7
                intersection_area = max(0, min(bbox[2], unique_bbox[2]) - max(bbox[0], unique_bbox[0])) * \
                                   max(0, min(bbox[3], unique_bbox[3]) - max(bbox[1], unique_bbox[1]))
                
                face_area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
                unique_area = (unique_bbox[2] - unique_bbox[0]) * (unique_bbox[3] - unique_bbox[1])
                
                if intersection_area / min(face_area, unique_area) > overlap_threshold:
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique_faces.append(face)

        logger.info(f"Processing {len(unique_faces)} unique faces in {os.path.basename(image_path)}")

        # Track recognized names to avoid duplicates in same image
        recognized_in_image = set()

        # Process each unique face
        for face_idx, face in enumerate(unique_faces):
            try:
                bbox = face.bbox.astype(int).tolist()
                
                # Normalize embedding
                embedding = face.normed_embedding
                if np.linalg.norm(embedding) > 0:
                    embedding = embedding / np.linalg.norm(embedding)
                else:
                    logger.warning(f"Zero embedding for face {face_idx}")
                    continue

                # Find best match
                best_match = None
                best_similarity = 0.0

                for name, known_emb in known_faces.items():
                    try:
                        similarity = cosine_similarity(embedding, known_emb)
                        
                        if (similarity > best_similarity and 
                            similarity > confidence_threshold and 
                            name not in recognized_in_image):
                            best_match = name
                            best_similarity = similarity
                    except Exception as e:
                        logger.debug(f"Error comparing with {name}: {e}")
                        continue

                # Create detection record
                detection = {
                    "imageIndex": image_index,
                    "faceIndex": face_idx,
                    "bbox": bbox,
                    "confidence": float(best_similarity),
                    "studentId": best_match if best_match else None
                }

                detections.append(detection)
                
                if best_match:
                    recognized_in_image.add(best_match)
                    logger.info(f"✓ Recognized: {best_match.title()} (confidence: {best_similarity:.3f})")

            except Exception as e:
                logger.error(f"Error processing face {face_idx}: {e}")
                continue

        # Save annotated image
        save_annotated_image(pil_original, unique_faces, known_faces, 
                           os.path.basename(image_path), confidence_threshold)

    except Exception as e:
        logger.error(f"Error processing {image_path}: {e}")

    return detections

def save_annotated_image(pil_image, faces, known_faces, image_name, confidence_threshold):
    """Save annotated image with bounding boxes and labels"""
    try:
        draw = ImageDraw.Draw(pil_image)
        
        # Try to load a font
        font_size = 20
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", font_size)
            except:
                try:
                    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
                except:
                    font = ImageFont.load_default()

        recognized_names = set()

        for face_idx, face in enumerate(faces):
            bbox = face.bbox.astype(int)
            embedding = face.normed_embedding
            
            if np.linalg.norm(embedding) > 0:
                embedding = embedding / np.linalg.norm(embedding)
            else:
                continue

            # Find best match
            best_match = "Unknown"
            best_similarity = 0.0

            for name, known_emb in known_faces.items():
                try:
                    similarity = cosine_similarity(embedding, known_emb)
                    if (similarity > best_similarity and 
                        similarity > confidence_threshold and 
                        name not in recognized_names):
                        best_match = name.title()
                        best_similarity = similarity
                except:
                    continue

            if best_match != "Unknown":
                recognized_names.add(best_match.lower())

            # Choose colors
            if best_match != "Unknown":
                box_color = "lime"
                text_color = "black"
                bg_color = "lime"
            else:
                box_color = "red"
                text_color = "white"
                bg_color = "red"

            # Draw bounding box
            box_width = 3
            draw.rectangle([bbox[0]-box_width//2, bbox[1]-box_width//2, 
                          bbox[2]+box_width//2, bbox[3]+box_width//2], 
                          outline=box_color, width=box_width)

            # Prepare label text
            label_text = f"{best_match}"
            confidence_text = f"{best_similarity:.2f}"
            
            # Calculate text position and background
            label_bbox = draw.textbbox((0, 0), label_text, font=font)
            conf_bbox = draw.textbbox((0, 0), confidence_text, font=font)
            
            text_width = max(label_bbox[2] - label_bbox[0], conf_bbox[2] - conf_bbox[0])
            text_height = (label_bbox[3] - label_bbox[1]) + (conf_bbox[3] - conf_bbox[1]) + 5
            
            # Position above the bbox
            text_x = bbox[0]
            text_y = max(0, bbox[1] - text_height - 10)
            
            # Draw background rectangle
            draw.rectangle([text_x-5, text_y-5, text_x+text_width+10, text_y+text_height+5], 
                          fill=bg_color)
            
            # Draw text
            draw.text((text_x, text_y), label_text, fill=text_color, font=font)
            draw.text((text_x, text_y + (label_bbox[3] - label_bbox[1]) + 2), 
                     confidence_text, fill=text_color, font=font)

        # Save annotated image
        output_path = os.path.join(OUTPUT_FOLDER, f"annotated_{image_name}")
        pil_image.save(output_path, quality=95)
        logger.info(f"Saved annotated image: {output_path}")
        
    except Exception as e:
        logger.error(f"Error saving annotated image: {e}")

def main():
    try:
        # Ensure directories exist
        os.makedirs(OUTPUT_FOLDER, exist_ok=True)

        # Check if embeddings file exists
        if not os.path.exists(EMBEDDINGS_FILE):
            logger.error("face_embeddings.pkl not found. Please run training first.")
            result = {
                "error": "No trained model found",
                "totalFaces": 0,
                "recognizedStudents": [],
                "averageConfidence": 0.0,
                "detections": []
            }
            print(json.dumps(result))
            sys.exit(1)

        # Load face embeddings
        with open(EMBEDDINGS_FILE, "rb") as f:
            known_faces = pickle.load(f)

        if not known_faces:
            logger.error("No trained faces found in embeddings file.")
            result = {
                "error": "No trained faces found",
                "totalFaces": 0,
                "recognizedStudents": [],
                "averageConfidence": 0.0,
                "detections": []
            }
            print(json.dumps(result))
            sys.exit(1)

        logger.info(f"Loaded {len(known_faces)} trained student embeddings")

        # Initialize Face Recognition Model
        logger.info("Initializing face recognition model...")
        app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
        app.prepare(ctx_id=0, det_size=(640, 640))

        # Check if test folder exists
        if not os.path.exists(TEST_FOLDER):
            logger.error(f"Test folder '{TEST_FOLDER}' not found.")
            result = {
                "error": "Test images folder not found",
                "totalFaces": 0,
                "recognizedStudents": [],
                "averageConfidence": 0.0,
                "detections": []
            }
            print(json.dumps(result))
            sys.exit(1)

        # Get all image files
        image_files = [f for f in os.listdir(TEST_FOLDER) 
                      if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp'))]
        
        if not image_files:
            logger.error("No valid image files found in test folder.")
            result = {
                "error": "No images found in test folder",
                "totalFaces": 0,
                "recognizedStudents": [],
                "averageConfidence": 0.0,
                "detections": []
            }
            print(json.dumps(result))
            sys.exit(1)

        logger.info(f"Processing {len(image_files)} test images...")

        # Process results
        all_detections = []
        total_faces = 0
        recognized_students = set()
        confidence_scores = []

        # Process each image
        for idx, image_name in enumerate(sorted(image_files)):
            image_path = os.path.join(TEST_FOLDER, image_name)
            logger.info(f"Processing image {idx+1}/{len(image_files)}: {image_name}")
            
            detections = process_single_image(image_path, known_faces, app, idx)
            
            if detections:
                all_detections.extend(detections)
                for detection in detections:
                    total_faces += 1
                    if detection['studentId']:
                        recognized_students.add(detection['studentId'])
                        confidence_scores.append(detection['confidence'])

        # Calculate results
        avg_confidence = np.mean(confidence_scores) if confidence_scores else 0.0
        recognition_rate = len(confidence_scores) / total_faces if total_faces > 0 else 0.0

        logger.info("\n" + "="*50)
        logger.info("RECOGNITION RESULTS")
        logger.info("="*50)
        logger.info(f"Images processed: {len(image_files)}")
        logger.info(f"Total faces detected: {total_faces}")
        logger.info(f"Students recognized: {len(recognized_students)}")
        logger.info(f"Recognition rate: {recognition_rate:.1%}")
        logger.info(f"Average confidence: {avg_confidence:.3f}")
        logger.info(f"Recognized students: {', '.join([s.title() for s in sorted(recognized_students)])}")

        # Prepare results for JSON output
        results = {
            "totalFaces": total_faces,
            "recognizedStudents": list(recognized_students),
            "averageConfidence": float(avg_confidence),
            "recognitionRate": float(recognition_rate),
            "detections": all_detections,
            "processedImages": len(image_files)
        }

        # Output JSON results for Node.js
        print(json.dumps(results))

    except Exception as e:
        logger.error(f"Recognition failed: {e}")
        import traceback
        traceback.print_exc()
        
        error_result = {
            "error": str(e),
            "totalFaces": 0,
            "recognizedStudents": [],
            "averageConfidence": 0.0,
            "detections": []
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()