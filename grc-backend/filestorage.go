package main

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

const (
	// MaxFileSize is 50MB
	MaxFileSize = 50 * 1024 * 1024 // 50 MB

	// AllowedFileTypes defines allowed MIME types
	AllowedFileTypes = "application/pdf,image/png,image/jpeg,image/jpg,image/gif," +
		"application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
		"application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
		"text/plain,text/csv"
)

// FileStorage handles file upload/download operations
type FileStorage struct {
	basePath string
}

// NewFileStorage creates a new FileStorage instance
func NewFileStorage(basePath string) *FileStorage {
	return &FileStorage{basePath: basePath}
}

// EnsureUploadDir creates the upload directory if it doesn't exist
func (fs *FileStorage) EnsureUploadDir() error {
	return os.MkdirAll(fs.basePath, 0755)
}

// SaveFile saves an uploaded file to disk and returns the stored filename
func (fs *FileStorage) SaveFile(file multipart.File, header *multipart.FileHeader) (string, error) {
	// Validate file size
	if header.Size > MaxFileSize {
		return "", fmt.Errorf("file size exceeds maximum allowed size of %d bytes", MaxFileSize)
	}

	// Validate content type
	contentType := header.Header.Get("Content-Type")
	if !fs.isAllowedFileType(contentType) {
		return "", fmt.Errorf("file type %s is not allowed", contentType)
	}

	// Generate unique filename preserving extension
	ext := filepath.Ext(header.Filename)
	storedFilename := uuid.New().String() + ext

	// Create full path
	fullPath := filepath.Join(fs.basePath, storedFilename)

	// Create file on disk
	dst, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()

	// Copy uploaded file to disk
	if _, err := io.Copy(dst, file); err != nil {
		os.Remove(fullPath) // Clean up on error
		return "", fmt.Errorf("failed to save file: %w", err)
	}

	return storedFilename, nil
}

// GetFilePath returns the full path to a stored file
func (fs *FileStorage) GetFilePath(storedFilename string) string {
	return filepath.Join(fs.basePath, storedFilename)
}

// DeleteFile removes a file from disk
func (fs *FileStorage) DeleteFile(storedFilename string) error {
	fullPath := filepath.Join(fs.basePath, storedFilename)
	return os.Remove(fullPath)
}

// isAllowedFileType checks if the content type is allowed
func (fs *FileStorage) isAllowedFileType(contentType string) bool {
	allowed := strings.Split(AllowedFileTypes, ",")
	for _, allowedType := range allowed {
		if strings.TrimSpace(allowedType) == contentType {
			return true
		}
	}
	return false
}
