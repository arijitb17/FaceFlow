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

# Path Configuration
DATASET_PATH = "dataset"
OUTPUT_FILE = "face_embeddings.pkl"

def main():
    try:
        # Check if dataset exists
        if not os.path.exists(DATASET_PATH):
            print(f"Error: Dataset folder '{DATASET_PATH}' not found")
            sys.exit(1)

        # Initialize InsightFace ArcFace model
        app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
        app.prepare(ctx_id=0)

        # Storage
        embedding_vectors = []
        labels = []

        # Augmentation pipeline
        augmenter = iaa.Sequential([
            iaa.Fliplr(0.5),
            iaa.Affine(rotate=(-10, 10)),
            iaa.GammaContrast((0.8, 1.2)),
            iaa.AdditiveGaussianNoise(scale=(0, 0.05*255)),
            iaa.Multiply((0.8, 1.2))
        ])

        # Collect embeddings
        face_dict = {}
        total_students = 0
        total_images_processed = 0

        for person_name in os.listdir(DATASET_PATH):
            person_path = os.path.join(DATASET_PATH, person_name)
            if not os.path.isdir(person_path):
                continue

            total_students += 1
            person_embeddings = []
            images_for_person = 0

            print(f"Processing student: {person_name}")

            for image_name in os.listdir(person_path):
                if not image_name.lower().endswith(('.jpg', '.jpeg', '.png')):
                    continue

                image_path = os.path.join(person_path, image_name)
                img = cv2.imread(image_path)
                
                if img is None:
                    print(f"Skipping broken file: {image_path}")
                    continue
                    
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

                # Process original image
                faces = app.get(img)
                if len(faces) > 0:
                    emb = faces[0].normed_embedding
                    person_embeddings.append(emb)
                    embedding_vectors.append(emb)
                    labels.append(person_name)
                    images_for_person += 1

                # Process augmented versions (2-3 augmentations per image)
                for aug_idx in range(2):
                    try:
                        aug_img = augmenter.augment_image(img)
                        faces_aug = app.get(aug_img)
                        if len(faces_aug) > 0:
                            emb = faces_aug[0].normed_embedding
                            person_embeddings.append(emb)
                            embedding_vectors.append(emb)
                            labels.append(person_name)
                    except Exception as e:
                        print(f"Augmentation failed for {image_path}: {e}")

            # Create average embedding for the person
            if person_embeddings:
                avg_embedding = np.mean(person_embeddings, axis=0)
                avg_embedding = avg_embedding / np.linalg.norm(avg_embedding)  # normalize
                face_dict[person_name.lower()] = avg_embedding
                total_images_processed += images_for_person
                print(f"  - Processed {images_for_person} images for {person_name}")
            else:
                print(f"  - Warning: No faces detected for {person_name}")

        # Save embeddings dictionary
        if face_dict:
            with open(OUTPUT_FILE, "wb") as f:
                pickle.dump(face_dict, f)
            
            print(f"\n✅ Training Complete!")
            print(f"   - Students trained: {len(face_dict)}")
            print(f"   - Total images processed: {total_images_processed}")
            print(f"   - Embeddings saved to: '{OUTPUT_FILE}'")
        else:
            print("\n❌ No faces detected in any images!")
            sys.exit(1)

        # Create visualization if we have enough data
        if len(embedding_vectors) > 5:
            create_visualization(embedding_vectors, labels)

    except Exception as e:
        print(f"Training failed: {e}")
        sys.exit(1)

def create_visualization(embedding_vectors, labels):
    """Create t-SNE visualization of face embeddings"""
    try:
        embedding_vectors = np.array(embedding_vectors)
        
        # Standardize embeddings
        scaler = StandardScaler()
        embedding_vectors = scaler.fit_transform(embedding_vectors)

        # Fit t-SNE
        perplexity = min(30, len(embedding_vectors) - 1)
        tsne = TSNE(n_components=2, perplexity=perplexity,
                    learning_rate=200, random_state=42, n_iter=1000)
        reduced_embeddings = tsne.fit_transform(embedding_vectors)

        # Create plot
        plt.figure(figsize=(12, 8))
        unique_labels = list(set(labels))
        colors = plt.cm.tab10(np.linspace(0, 1, len(unique_labels)))
        
        for i, label in enumerate(unique_labels):
            mask = [l == label for l in labels]
            plt.scatter(reduced_embeddings[mask, 0], reduced_embeddings[mask, 1],
                       c=[colors[i]], label=label, s=60, alpha=0.7)

        plt.xlabel("t-SNE Component 1")
        plt.ylabel("t-SNE Component 2")
        plt.title("Face Embeddings Clustering Visualization")
        plt.legend(title="Students", loc="best", bbox_to_anchor=(1, 1))
        plt.tight_layout()
        plt.savefig("training_visualization.png", dpi=300, bbox_inches='tight')
        plt.close()
        print(f"   - Visualization saved to: 'training_visualization.png'")
    except Exception as e:
        print(f"   - Visualization failed: {e}")

if __name__ == "__main__":
    main()