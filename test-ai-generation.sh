#!/bin/bash

# Test script for Advanced AI Checklist Generation
# Usage: ./test-ai-generation.sh

echo "Testing Advanced AI Checklist Generation..."

curl -X POST http://localhost:8787/api/checklist/checklist-templates/generate-ai-simple \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "Construção Civil",
    "location_type": "Canteiro de Obras",
    "template_name": "Teste Avançado NR-35",
    "category": "Segurança",
    "num_questions": 5,
    "detail_level": "avancado",
    "regulation": "NR-35 - Trabalho em Altura",
    "specific_requirements": "Incluir verificação de cintos e pontos de ancoragem."
  }'

echo -e "\n\nTest completed."
