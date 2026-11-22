import Swal from 'sweetalert2';
import type { ApiError } from './api';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  didOpen: (element) => {
    // Con el ratón encima el aviso no desaparece
    element.addEventListener('mouseenter', Swal.stopTimer);
    element.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

export const toast = {
  success: (title: string) => Toast.fire({ icon: 'success', title }),
  info: (title: string) => Toast.fire({ icon: 'info', title }),
  warning: (title: string) => Toast.fire({ icon: 'warning', title }),
  error: (title: string) => Toast.fire({ icon: 'error', title, timer: 5000 }),
  // Mensaje del servidor seguido del detalle de los campos inválidos, si los hay
  apiError: (error: ApiError) =>
    Toast.fire({
      icon: 'error',
      title: [error.message, ...error.details.map((d) => `${d.campo ? `${d.campo}: ` : ''}${d.mensaje}`)].join(' · '),
      timer: 6000,
    }),
};
