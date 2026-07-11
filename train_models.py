import os
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator

# 1. Setup paths
DATASET_DIR = r"D:\Skin_Project\dataset"
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

# 2. Define the exact same architecture as app.py
def build_model(num_classes):
    # CRITICAL FIX: Use weights='imagenet' for Transfer Learning!
    base = MobileNetV2(input_shape=(224,224,3), include_top=False, weights=r"d:\PO\mobilenet_v2_weights.h5")
    base.trainable = False # Freeze the base model to retain knowledge
    
    inputs = keras.Input(shape=(224,224,3))
    x = base(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(256, activation='relu')(x)
    x = layers.Dropout(0.4)(x)
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.3)(x)
    
    if num_classes == 1:
        outputs = layers.Dense(1, activation='sigmoid')(x)
    else:
        outputs = layers.Dense(num_classes, activation='softmax')(x)
        
    return keras.Model(inputs, outputs)

# Use image_dataset_from_directory instead of ImageDataGenerator to bypass scipy bug
def train_and_save(dataset_path, num_classes, model_name, output_npz, epochs=10):
    print(f"\n--- Training {model_name} ---")
    
    class_mode = 'binary' if num_classes == 1 else 'categorical'
    
    train_ds = tf.keras.utils.image_dataset_from_directory(
        dataset_path,
        validation_split=0.2,
        subset="training",
        seed=123,
        image_size=(224, 224),
        batch_size=32,
        label_mode=class_mode
    )
    
    val_ds = tf.keras.utils.image_dataset_from_directory(
        dataset_path,
        validation_split=0.2,
        subset="validation",
        seed=123,
        image_size=(224, 224),
        batch_size=32,
        label_mode=class_mode
    )
    
    # Preprocess: scale from [0, 255] to [0, 1] to match app.py
    normalization_layer = tf.keras.layers.Rescaling(1./255)
    train_ds = train_ds.map(lambda x, y: (normalization_layer(x), y))
    val_ds = val_ds.map(lambda x, y: (normalization_layer(x), y))
    
    # Build and compile model
    model = build_model(num_classes)
    loss = 'binary_crossentropy' if num_classes == 1 else 'categorical_crossentropy'
    model.compile(optimizer='adam', loss=loss, metrics=['accuracy'])
    
    # Fix dataset imbalance for Allergy model
    class_weights = None
    if num_classes == 4:
        # Based on your dataset counts: AD (70), CD (477), EC (466), SD (79)
        # We assign higher weights to the diseases with fewer images!
        class_weights = {
            0: 3.90,  # Atopic Dermatitis
            1: 0.57,  # Contact Dermatitis
            2: 0.58,  # Eczema
            3: 3.45   # Seborrheic Dermatitis
        }
        
    # Train with class weights!
    model.fit(train_ds, validation_data=val_ds, epochs=epochs, class_weight=class_weights)
    
    # Save exact weights for app.py
    weights = model.get_weights()
    save_path = os.path.join(OUTPUT_DIR, output_npz)
    np.savez(save_path, *weights)
    print(f"Saved {model_name} weights to {save_path}")

if __name__ == "__main__":
    # Stage 1: Allergy (0) vs Infection (1) 
    # (Assuming 2 classes in stage1 folder, we can treat it as binary or categorical.
    # Wait, app.py expects output dense=1 for stage 1. Let's make sure it handles 2 classes properly)
    
    # Note: For stage1, if there are 2 folders (allergy, infection), binary mode outputs 1 node.
    train_and_save(os.path.join(DATASET_DIR, "stage1"), 1, "Stage 1 Model", "stage1_weights.npz", epochs=10)
    
    # Stage 2: Allergy (4 classes)
    train_and_save(os.path.join(DATASET_DIR, "stage2_allergy"), 4, "Allergy Model", "allergy_weights.npz", epochs=15)
    
    # Stage 2: Infection (2 classes)
    train_and_save(os.path.join(DATASET_DIR, "stage2_infection"), 2, "Infection Model", "infection_weights.npz", epochs=10)
    
    print("\nAll models trained and saved successfully! You can now restart your app.py server.")
