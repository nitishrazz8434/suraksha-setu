# SurakshaSetu: Multimodal Disaster Intelligence and Capacity-Aware Relocation

## Problem

Problem statement 2619 calls for identifying hazard-based candidate red zones, assessing alternative sites' carrying capacity and prioritizing vulnerable habitations. Authorities must connect geographic evidence, unstructured reports, resource constraints and planning decisions.

## Objective

Develop an integrated academic decision-support platform combining computer vision, natural language processing, geospatial assessment and constrained allocation. Demonstrate the complete workflow in a labelled Wayanad exercise covering floods and landslide susceptibility.

## Contributions

1. Image segmentation, detection and change/damage assessment training and inference workflows.
2. Structured report extraction, classification comparisons and paired multimodal fusion experiments.
3. Interpretable assessment linking hazards, exposure, assisted needs and access constraints.
4. Resource-limited site assessment and an integer allocation solver with eligibility constraints.
5. A source-labelled copilot that accesses current calculations and uploaded documents.
6. A reproducible scenario laboratory comparing optimized and nearest-site allocation.
7. Persistent evidence, incident review, field tasks, document management and exportable decisions.

## Research questions

- Does fusion improve crisis classification over separately trained image-only and text-only baselines on the same held-out events?
- How much do transfer learning and segmentation architectures change performance under geographic shift?
- Under which access and resource constraints does global allocation improve coverage over nearest-site allocation?
- How do risk-weight choices affect priority coverage and travel cost?
- How accurately do generated summaries preserve source facts and numerical values?

## Subject alignment

| Unit | CSE471 connection | CSE472 connection |
| --- | --- | --- |
| I | Images, preprocessing and neural inputs | Text normalization and TF-IDF |
| II | Convolutions, training, dropout and batch normalization | Learned embedding representations |
| III | ResNet transfer learning and freezing | BiLSTM classification |
| IV | Detector workflow and localization metrics | Sequence-to-sequence summarization and evaluation |
| V | U-Net/DeepLab segmentation | BERT classification and tokenization |
| VI | CLIP and Grad-CAM experiments | Grounded generation, decoding and factuality review |

This maps selected concepts from all units; it does not claim every architecture in either syllabus is implemented or evaluated.

## Evaluation

Report dataset provenance, split event identifiers, per-class precision/recall/F1, pixel IoU/Dice, detector mAP, ROUGE with factuality review, inference latency and failed cases. Planning evaluation reports people allocated, unallocated demand, assisted coverage, capacity violations and route cost. Compare methods under identical constraints. Clearly separate synthetic system demonstrations from real held-out model results.

## Deliverables

Web application; source code; planning engine; schema and migrations; API routes; model training/inference scripts; tests; architecture and methodology; reproducible exports; a demonstration script. Checkpoints and benchmark reports are experimental outputs generated after data acquisition and training, not fabricated submission assets.
