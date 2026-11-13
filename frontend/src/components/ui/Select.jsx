import { forwardRef } from 'react';
import CustomSelect from './CustomSelect.jsx';

// Componente Select unificado con CustomSelect
const Select = forwardRef(function Select(props, ref) {
  return <CustomSelect ref={ref} {...props} />;
});

export default Select;
