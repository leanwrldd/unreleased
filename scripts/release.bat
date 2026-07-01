@echo off
title Unreleased — Release ^& Publish
cd /d "%~dp0\.."
python scripts\release.py
