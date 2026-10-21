# ==============================================================================
# Diabetic Retinopathy Screening System Makefile
# ==============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Environment configuration
VENV ?= backend/.venv
PYTHON ?= $(VENV)/bin/python
PYTEST ?= $(VENV)/bin/pytest
UVICORN ?= $(VENV)/bin/uvicorn
MYPY ?= $(VENV)/bin/mypy
RUFF ?= $(VENV)/bin/ruff

# Colors for terminal output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RESET := \033[0m

.PHONY: help install install-backend install-frontend test test-backend lint format dev-backend dev-frontend dev build preview clean

help: ## Show this help message and target descriptions
	@echo -e "$(CYAN)Diabetic Retinopathy Screening System - Make Commands$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-18s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# ------------------------------------------------------------------------------
# Dependencies & Setup
# ------------------------------------------------------------------------------

install: install-backend install-frontend ## Install all backend and frontend dependencies

install-backend: ## Set up Python virtual environment and install backend requirements
	@echo -e "$(YELLOW)--> Setting up backend virtualenv and dependencies...$(RESET)"
	@if [ ! -d "$(VENV)" ]; then python3 -m venv $(VENV); fi
	@$(PYTHON) -m pip install --upgrade pip
	@$(PYTHON) -m pip install -r backend/requirements.txt
	@echo -e "$(GREEN)Backend dependencies installed successfully.$(RESET)"

install-frontend: ## Install frontend npm dependencies
	@echo -e "$(YELLOW)--> Installing frontend dependencies...$(RESET)"
	@npm install --prefix frontend
	@echo -e "$(GREEN)Frontend dependencies installed successfully.$(RESET)"

# ------------------------------------------------------------------------------
# Testing & Code Quality
# ------------------------------------------------------------------------------

test: test-backend ## Run all test suites

test-backend: ## Run backend pytest suite with assertions
	@echo -e "$(YELLOW)--> Running backend tests...$(RESET)"
	@$(PYTEST) -v backend/tests
	@echo -e "$(GREEN)All backend tests passed.$(RESET)"

lint: ## Run static analysis (ruff check and mypy type checks)
	@echo -e "$(YELLOW)--> Running ruff linting checks...$(RESET)"
	@$(RUFF) check backend/app backend/tests
	@echo -e "$(YELLOW)--> Running mypy type checks...$(RESET)"
	@cd backend && .venv/bin/mypy --config-file mypy.ini app tests
	@echo -e "$(GREEN)All linting and type checks passed.$(RESET)"

format: ## Format backend code with ruff
	@echo -e "$(YELLOW)--> Formatting backend code with ruff...$(RESET)"
	@$(RUFF) format backend/app backend/tests

# ------------------------------------------------------------------------------
# Development & Execution
# ------------------------------------------------------------------------------

dev-backend: ## Run FastAPI backend development server on http://localhost:8000
	@echo -e "$(CYAN)--> Starting FastAPI server (http://localhost:8000)...$(RESET)"
	@cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

dev-frontend: ## Run Vite frontend development server on http://localhost:5173
	@echo -e "$(CYAN)--> Starting Vite frontend dev server (http://localhost:5173)...$(RESET)"
	@npm run dev --prefix frontend

dev: ## Instructions to run full development stack
	@echo -e "$(CYAN)To run the full stack, start both servers in separate terminal tabs:$(RESET)"
	@echo -e "  Tab 1 (Backend):  $(GREEN)make dev-backend$(RESET)"
	@echo -e "  Tab 2 (Frontend): $(GREEN)make dev-frontend$(RESET)"

# ------------------------------------------------------------------------------
# Build & Distribution
# ------------------------------------------------------------------------------

build: ## Build frontend application for production
	@echo -e "$(YELLOW)--> Building frontend production bundle...$(RESET)"
	@npm run build --prefix frontend
	@echo -e "$(GREEN)Frontend build complete in frontend/dist.$(RESET)"

preview: ## Preview the production frontend build locally
	@npm run preview --prefix frontend

clean: ## Clean cached files, build artifacts, and test caches
	@echo -e "$(YELLOW)--> Cleaning temporary caches and build artifacts...$(RESET)"
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	@rm -rf frontend/dist
	@echo -e "$(GREEN)Clean complete.$(RESET)"
