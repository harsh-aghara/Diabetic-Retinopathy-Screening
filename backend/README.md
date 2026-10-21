# Disease Risk Prediction Backend (FastAPI)

Production-ready clinical screening API powered by a stacked ensemble (Random Forest + Support Vector Machine + Logistic Regression Meta-Learner) with automatic deterministic heuristic fallback for CDC BRFSS 2015 diabetes risk assessment.

## Features

- **Strict Static Typing**: 100% typed with Python `typing`, `Literal`, `Annotated`, and `pydantic.mypy` plugin in `mypy` strict mode.
- **Safety-Critical Bounds**: Boundary checks for all 21 CDC BRFSS 2015 features preventing out-of-range clinical values.
- **Deterministic Mock Engine**: Logistic sigmoid heuristic enabling smooth, monotonic live recalculations (<5ms) for HCI direct manipulation before ML `.pkl` artifacts are loaded.
- **Pluggable Artifact Loader**: Automatically switches to the real stacked ensemble model when `artifacts/model.pkl` is present with zero changes required to routes or frontend.

## Quickstart (using uv)

```bash
# 1. Create virtual environment
uv venv .venv

# 2. Activate virtual environment
source .venv/bin/activate

# 3. Install dependencies
uv pip install -r requirements.txt

# 4. Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive API documentation (Swagger UI):
- [http://localhost:8000/docs](http://localhost:8000/docs)
- [http://localhost:8000/redoc](http://localhost:8000/redoc)

## Verification & Testing

```bash
# Run strict static type checking
mypy app tests

# Run unit and integration tests
pytest -v
```
