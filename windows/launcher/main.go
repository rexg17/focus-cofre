// Launcher do Focus Cofre para Windows: abre o Python embutido na pasta, sem janela de console.
package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"unsafe"
)

const nome = "Focus Cofre"

func aviso(texto string) {
	p := syscall.NewLazyDLL("user32.dll").NewProc("MessageBoxW")
	t, _ := syscall.UTF16PtrFromString(texto)
	c, _ := syscall.UTF16PtrFromString(nome)
	p.Call(0, uintptr(unsafe.Pointer(t)), uintptr(unsafe.Pointer(c)), 0x10)
}

func main() {
	exe, err := os.Executable()
	if err != nil {
		aviso("Não consegui localizar o programa.")
		os.Exit(1)
	}
	dir := filepath.Dir(exe)
	py := filepath.Join(dir, "python", "pythonw.exe")
	app := filepath.Join(dir, "app", "app.py")
	for _, f := range []string{py, app} {
		if _, err := os.Stat(f); err != nil {
			aviso("Arquivo não encontrado:\n" + f + "\n\nExtraia a pasta inteira do .zip antes de abrir o Focus Cofre.")
			os.Exit(1)
		}
	}
	args := append([]string{app, "--janela"}, os.Args[1:]...)
	cmd := exec.Command(py, args...)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(),
		"PYTHONPATH="+filepath.Join(dir, "site-packages"),
		"PYTHONNOUSERSITE=1", "PYTHONUTF8=1")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	if err := cmd.Start(); err != nil {
		aviso("Não consegui iniciar o Focus Cofre:\n" + err.Error())
		os.Exit(1)
	}
}
