// components/ErrorBoundary.jsx

'use client';  // This tells Next.js that this is a Client Component

import React, { Component } from 'react';
import { toast } from 'react-hot-toast';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("Error:", error);
    console.error("Error Info:", errorInfo);
    toast.error('Something went wrong!', {
      position: toast.POSITION.TOP_CENTER,
    });
  }

  render() {
    if (this.state.hasError) {
      return <div style={{ color: 'red', padding: '10px' }}>Something went wrong. Please try again later.</div>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
