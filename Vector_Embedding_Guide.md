# Vector Embedding Guide

## What are Vector Embeddings?

Vector embeddings are numerical representations of data (text, images, etc.) in a high-dimensional space where similar items are placed closer together. They capture semantic meaning and relationships between items.

## Basic Concepts

### 1. Text Embeddings
```javascript
// Using TensorFlow.js for text embeddings
import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';

async function createTextEmbedding(text) {
    // Load the model
    const model = await use.load();
    
    // Generate embedding
    const embedding = await model.embed(text);
    
    // Convert to array
    const embeddingArray = await embedding.array();
    return embeddingArray[0];
}

// Example usage
const text = "Hello, this is a sample text";
createTextEmbedding(text).then(embedding => {
    console.log('Text embedding:', embedding);
});
```

### 2. Simple Word Embeddings
```javascript
// Simple word embedding implementation
class SimpleWordEmbedding {
    constructor(vocabSize, embeddingDim) {
        this.embeddings = new Map();
        this.embeddingDim = embeddingDim;
    }

    // Initialize random embeddings for words
    initializeEmbedding(word) {
        if (!this.embeddings.has(word)) {
            const embedding = Array.from(
                { length: this.embeddingDim },
                () => Math.random() * 2 - 1
            );
            this.embeddings.set(word, embedding);
        }
        return this.embeddings.get(word);
    }

    // Get embedding for a word
    getEmbedding(word) {
        return this.embeddings.get(word) || this.initializeEmbedding(word);
    }
}

// Example usage
const wordEmbedding = new SimpleWordEmbedding(1000, 50);
console.log(wordEmbedding.getEmbedding('hello'));
```

## Common Embedding Types

### 1. Word2Vec Style Embeddings
```javascript
class Word2VecEmbedding {
    constructor() {
        this.embeddings = new Map();
    }

    // Train simple word embeddings
    train(corpus, windowSize = 2) {
        for (let i = 0; i < corpus.length; i++) {
            const word = corpus[i];
            const context = this.getContext(corpus, i, windowSize);
            this.updateEmbedding(word, context);
        }
    }

    // Get context words
    getContext(corpus, index, windowSize) {
        const start = Math.max(0, index - windowSize);
        const end = Math.min(corpus.length, index + windowSize + 1);
        return corpus.slice(start, end).filter((_, i) => i !== index - start);
    }

    // Update embedding based on context
    updateEmbedding(word, context) {
        if (!this.embeddings.has(word)) {
            this.embeddings.set(word, this.initializeEmbedding());
        }
        // Simple update rule (simplified version)
        const embedding = this.embeddings.get(word);
        context.forEach(contextWord => {
            if (!this.embeddings.has(contextWord)) {
                this.embeddings.set(contextWord, this.initializeEmbedding());
            }
            const contextEmbedding = this.embeddings.get(contextWord);
            this.updateVector(embedding, contextEmbedding);
        });
    }

    initializeEmbedding() {
        return Array.from({ length: 50 }, () => Math.random() * 2 - 1);
    }

    updateVector(embedding, contextEmbedding) {
        for (let i = 0; i < embedding.length; i++) {
            embedding[i] += 0.01 * (contextEmbedding[i] - embedding[i]);
        }
    }
}
```

### 2. Sentence Embeddings
```javascript
class SentenceEmbedding {
    constructor(wordEmbedding) {
        this.wordEmbedding = wordEmbedding;
    }

    // Create sentence embedding by averaging word embeddings
    getSentenceEmbedding(sentence) {
        const words = sentence.toLowerCase().split(' ');
        const wordEmbeddings = words.map(word => 
            this.wordEmbedding.getEmbedding(word)
        );
        
        // Average the word embeddings
        return this.averageEmbeddings(wordEmbeddings);
    }

    averageEmbeddings(embeddings) {
        const sum = embeddings.reduce((acc, curr) => 
            acc.map((val, i) => val + curr[i]), 
            new Array(embeddings[0].length).fill(0)
        );
        return sum.map(val => val / embeddings.length);
    }
}
```

## Practical Applications

### 1. Similarity Search
```javascript
class SimilaritySearch {
    constructor(embeddings) {
        this.embeddings = embeddings;
    }

    // Find similar items using cosine similarity
    findSimilar(queryEmbedding, topK = 5) {
        const similarities = Array.from(this.embeddings.entries())
            .map(([item, embedding]) => ({
                item,
                similarity: this.cosineSimilarity(queryEmbedding, embedding)
            }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);

        return similarities;
    }

    cosineSimilarity(v1, v2) {
        const dotProduct = v1.reduce((sum, val, i) => sum + val * v2[i], 0);
        const norm1 = Math.sqrt(v1.reduce((sum, val) => sum + val * val, 0));
        const norm2 = Math.sqrt(v2.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (norm1 * norm2);
    }
}
```

### 2. Text Classification
```javascript
class TextClassifier {
    constructor(embeddingModel) {
        this.embeddingModel = embeddingModel;
        this.classEmbeddings = new Map();
    }

    // Train classifier with labeled examples
    train(texts, labels) {
        texts.forEach((text, i) => {
            const embedding = this.embeddingModel.getSentenceEmbedding(text);
            const label = labels[i];
            
            if (!this.classEmbeddings.has(label)) {
                this.classEmbeddings.set(label, []);
            }
            this.classEmbeddings.get(label).push(embedding);
        });

        // Compute average embedding for each class
        this.classEmbeddings.forEach((embeddings, label) => {
            this.classEmbeddings.set(
                label,
                this.averageEmbeddings(embeddings)
            );
        });
    }

    // Classify new text
    classify(text) {
        const embedding = this.embeddingModel.getSentenceEmbedding(text);
        let bestLabel = null;
        let bestSimilarity = -1;

        this.classEmbeddings.forEach((classEmbedding, label) => {
            const similarity = this.cosineSimilarity(embedding, classEmbedding);
            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestLabel = label;
            }
        });

        return bestLabel;
    }

    averageEmbeddings(embeddings) {
        const sum = embeddings.reduce((acc, curr) => 
            acc.map((val, i) => val + curr[i]), 
            new Array(embeddings[0].length).fill(0)
        );
        return sum.map(val => val / embeddings.length);
    }

    cosineSimilarity(v1, v2) {
        const dotProduct = v1.reduce((sum, val, i) => sum + val * v2[i], 0);
        const norm1 = Math.sqrt(v1.reduce((sum, val) => sum + val * val, 0));
        const norm2 = Math.sqrt(v2.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (norm1 * norm2);
    }
}
```

## Best Practices

1. **Preprocessing**
   - Clean and normalize text
   - Handle special characters
   - Consider language-specific requirements

2. **Model Selection**
   - Choose appropriate embedding dimension
   - Consider computational resources
   - Evaluate model performance

3. **Performance Optimization**
   - Cache frequently used embeddings
   - Use efficient similarity calculations
   - Implement batch processing

4. **Quality Assurance**
   - Validate embedding quality
   - Monitor semantic relationships
   - Regular model updates

## Common Use Cases

1. **Search Engines**
   - Semantic search
   - Query understanding
   - Result ranking

2. **Recommendation Systems**
   - Content similarity
   - User preference matching
   - Item clustering

3. **Natural Language Processing**
   - Text classification
   - Sentiment analysis
   - Language understanding

4. **Image Processing**
   - Image similarity
   - Feature extraction
   - Visual search 