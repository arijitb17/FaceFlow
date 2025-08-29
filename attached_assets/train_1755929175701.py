import os
import cv2
import numpy as np
import imgaug.augmenters as iaa
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.manifold import TSNE
from sklearn.preprocessing import StandardScaler
from insightface.app import FaceAnalysis
import pickle
import sys
import base64
from PIL import Image
import io

# Path Configuration
DATASET_PATH = "dataset"
OUTPUT_FILE = "face_embeddings.pkl"
VISUALIZATION_PATH = "training_visualization.png"

def main():
    try:
        # Check if dataset exists
        if not os.path.exists(DATASET_PATH):
            print(f"Error: Dataset folder '{DATASET_PATH}' not found")
            sys.exit(1)

        # Initialize InsightFace ArcFace model
        print("Initializing face recognition model...")
        app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
        app.prepare(ctx_id=0, det_size=(640, 640))

        # Storage
        embedding_vectors = []
        labels = []
        face_dict = {}
        total_students = 0
        total_images_processed = 0

        # Enhanced augmentation pipeline for better training
        augmenter = iaa.Sequential([
            iaa.Fliplr(0.5),  # Horizontal flip
            iaa.Affine(rotate=(-15, 15)),  # Rotation
            iaa.Multiply((0.8, 1.2)),  # Brightness
            iaa.GammaContrast((0.7, 1.3)),  # Contrast
            iaa.AdditiveGaussianNoise(scale=(0, 0.03*255)),  # Noise
            iaa.GaussianBlur(sigma=(0, 1.0)),  # Slight blur
        ])

        print("Processing student photos...")

        # Process each student folder
        student_folders = [d for d in os.listdir(DATASET_PATH) 
                          if os.path.isdir(os.path.join(DATASET_PATH, d))]
        
        if not student_folders:
            print("Error: No student folders found in dataset")
            sys.exit(1)

        for student_folder in sorted(student_folders):
            person_path = os.path.join(DATASET_PATH, student_folder)
            total_students += 1
            person_embeddings = []
            images_for_person = 0

            print(f"Processing student: {student_folder}")

            # Get all image files in student folder
            image_files = [f for f in os.listdir(person_path) 
                          if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
            
            if not image_files:
                print(f"  - No images found for {student_folder}")
                continue

            for image_name in image_files:
                image_path = os.path.join(person_path, image_name)
                
                try:
                    # Load and process original image
                    img = cv2.imread(image_path)
                    if img is None:
                        print(f"  - Skipping corrupted file: {image_name}")
                        continue
                        
                    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

                    # Detect faces in original image
                    faces = app.get(img_rgb)
                    if len(faces) > 0:
                        # Use the largest face (main subject)
                        face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
                        emb = face.normed_embedding
                        person_embeddings.append(emb)
                        embedding_vectors.append(emb)
                        labels.append(student_folder)
                        images_for_person += 1

                    # Create augmented versions for better training
                    num_augmentations = min(3, max(1, 5 - len(image_files)))  # Adaptive augmentation
                    
                    for aug_idx in range(num_augmentations):
                        try:
                            aug_img = augmenter.augment_image(img_rgb)
                            faces_aug = app.get(aug_img)
                            
                            if len(faces_aug) > 0:
                                face_aug = max(faces_aug, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
                                emb_aug = face_aug.normed_embedding
                                person_embeddings.append(emb_aug)
                                embedding_vectors.append(emb_aug)
                                labels.append(student_folder)
                                
                        except Exception as e:
                            print(f"  - Augmentation {aug_idx} failed: {e}")
                            continue

                except Exception as e:
                    print(f"  - Error processing {image_name}: {e}")
                    continue

            # Create representative embedding for the student
            if person_embeddings:
                # Use median embedding for robustness (less affected by outliers)
                person_embeddings = np.array(person_embeddings)
                
                # Calculate median embedding
                median_embedding = np.median(person_embeddings, axis=0)
                median_embedding = median_embedding / np.linalg.norm(median_embedding)
                
                face_dict[student_folder.lower()] = median_embedding
                total_images_processed += images_for_person
                
                print(f"  - Successfully processed {images_for_person} images")
                print(f"  - Generated {len(person_embeddings)} training samples")
            else:
                print(f"  - Warning: No faces detected for {student_folder}")

        # Validate training results
        if not face_dict:
            print("Error: No valid face embeddings generated!")
            sys.exit(1)

        if len(face_dict) < 2:
            print("Warning: Only one student trained. Recognition may not work optimally.")

        # Save embeddings
        with open(OUTPUT_FILE, "wb") as f:
            pickle.dump(face_dict, f)

        print(f"\n✅ Training Complete!")
        print(f"   - Students trained: {len(face_dict)}")
        print(f"   - Total images processed: {total_images_processed}")
        print(f"   - Total training samples: {len(embedding_vectors)}")
        print(f"   - Embeddings saved to: '{OUTPUT_FILE}'")

        # Create visualization if sufficient data
        if len(embedding_vectors) >= 4:
            create_enhanced_visualization(embedding_vectors, labels)
            print(f"   - Training visualization saved to: '{VISUALIZATION_PATH}'")

        # Quality assessment
        assess_training_quality(face_dict, labels)

    except Exception as e:
        print(f"Training failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

def create_enhanced_visualization(embedding_vectors, labels):
    """Create comprehensive t-SNE visualization"""
    try:
        embedding_vectors = np.array(embedding_vectors)
        
        # Standardize embeddings
        scaler = StandardScaler()
        embedding_vectors_scaled = scaler.fit_transform(embedding_vectors)

        # Adjust perplexity based on data size
        n_samples = len(embedding_vectors)
        perplexity = min(30, max(5, n_samples // 3))
        
        # Fit t-SNE with appropriate parameters
        tsne = TSNE(
            n_components=2, 
            perplexity=perplexity,
            learning_rate=200, 
            random_state=42, 
            n_iter=1000,
            metric='cosine'
        )
        reduced_embeddings = tsne.fit_transform(embedding_vectors_scaled)

        # Create enhanced plot
        plt.figure(figsize=(14, 10))
        
        # Set style
        plt.style.use('seaborn-v0_8')
        unique_labels = sorted(list(set(labels)))
        colors = plt.cm.Set3(np.linspace(0, 1, len(unique_labels)))
        
        # Plot points with better styling
        for i, label in enumerate(unique_labels):
            mask = np.array([l == label for l in labels])
            plt.scatter(
                reduced_embeddings[mask, 0], 
                reduced_embeddings[mask, 1],
                c=[colors[i]], 
                label=label.title(),
                s=80,
                alpha=0.7,
                edgecolors='black',
                linewidth=0.5
            )

        plt.xlabel("t-SNE Component 1", fontsize=12)
        plt.ylabel("t-SNE Component 2", fontsize=12)
        plt.title("Face Embeddings Clustering Visualization", fontsize=14, fontweight='bold')
        plt.legend(title="Students", loc="center left", bbox_to_anchor=(1, 0.5))
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(VISUALIZATION_PATH, dpi=300, bbox_inches='tight')
        plt.close()
        
    except Exception as e:
        print(f"Visualization creation failed: {e}")

def assess_training_quality(face_dict, labels):
    """Assess the quality of training data"""
    try:
        print(f"\n📊 Training Quality Assessment:")
        
        # Calculate embedding similarities within and between students
        student_names = list(face_dict.keys())
        
        if len(student_names) >= 2:
            # Calculate inter-student distances (should be high)
            inter_distances = []
            for i in range(len(student_names)):
                for j in range(i+1, len(student_names)):
                    emb1 = face_dict[student_names[i]]
                    emb2 = face_dict[student_names[j]]
                    distance = np.linalg.norm(emb1 - emb2)
                    inter_distances.append(distance)
            
            avg_inter_distance = np.mean(inter_distances)
            print(f"   - Average inter-student distance: {avg_inter_distance:.3f}")
            
            if avg_inter_distance > 0.8:
                print("   - Quality: EXCELLENT - Students are well separated")
            elif avg_inter_distance > 0.6:
                print("   - Quality: GOOD - Students are adequately separated")
            elif avg_inter_distance > 0.4:
                print("   - Quality: FAIR - Some students may be confused")
            else:
                print("   - Quality: POOR - Students are too similar, add more diverse photos")

        # Sample distribution
        label_counts = {}
        for label in labels:
            label_counts[label] = label_counts.get(label, 0) + 1
        
        min_samples = min(label_counts.values()) if label_counts else 0
        max_samples = max(label_counts.values()) if label_counts else 0
        avg_samples = sum(label_counts.values()) / len(label_counts) if label_counts else 0
        
        print(f"   - Samples per student: {min_samples}-{max_samples} (avg: {avg_samples:.1f})")
        
        if min_samples >= 5:
            print("   - Sample size: EXCELLENT")
        elif min_samples >= 3:
            print("   - Sample size: GOOD") 
        elif min_samples >= 2:
            print("   - Sample size: ACCEPTABLE")
        else:
            print("   - Sample size: POOR - Add more photos per student")

    except Exception as e:
        print(f"Quality assessment failed: {e}")

def process_base64_image(base64_string, app):
    """Process a base64 encoded image and return face embedding"""
    try:
        # Decode base64 to image
        if base64_string.startswith('data:image'):
            base64_string = base64_string.split(',')[1]
        
        image_data = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to numpy array
        img_array = np.array(image.convert('RGB'))
        
        # Get face embeddings
        faces = app.get(img_array)
        if len(faces) > 0:
            # Return the largest face embedding
            largest_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
            return largest_face.normed_embedding
        else:
            return None
            
    except Exception as e:
        print(f"Error processing base64 image: {e}")
        return None

if __name__ == "__main__":
    main()